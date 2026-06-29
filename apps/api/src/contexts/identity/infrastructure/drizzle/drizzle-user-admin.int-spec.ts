import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { createDb, Db } from '../../../../shared/db';
import { usersTable, grantsTable } from './schema';
import {
  organizationsTable,
  organizationMembersTable,
} from '../../../organizations/infrastructure/drizzle/schema';
import { emergenciesTable } from '../../../emergencies/infrastructure/drizzle/schema';
import { auditLogTable } from '../../../audit/infrastructure/drizzle/schema';
import { DrizzleUserAdminRepository } from './drizzle-user-admin.repository';
import { DrizzleGrantRepository } from './drizzle-grant.repository';
import { DrizzleOrganizationReader } from './drizzle-organization-reader';
import { DrizzleScopeNameReader } from './drizzle-scope-name-reader';
import { DrizzleUserActivityReader } from './drizzle-user-activity-reader';
import { ListUsersAdmin } from '../../application/list-users-admin';
import { GetUserAdminDetail } from '../../application/get-user-admin-detail';
import { UserNotFoundError } from '../../domain/user-not-found.error';

const URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';

const USER_A = 'a1111111-1111-4111-8111-111111111111';
const USER_B = 'b2222222-2222-4222-8222-222222222222';
const ORG_ID = 'c3333333-3333-4333-8333-333333333333';
const EMERGENCY_ID = 'e4444444-4444-4444-8444-444444444444';

describe('User admin reads (integration)', () => {
  let db: Db;
  let pool: Pool;
  let listAdmin: ListUsersAdmin;
  let getDetail: GetUserAdminDetail;

  beforeAll(() => {
    ({ db, pool } = createDb(URL));
    const userAdminRepo = new DrizzleUserAdminRepository(db);
    const grantRepo = new DrizzleGrantRepository(db);
    const orgReader = new DrizzleOrganizationReader(db);
    const scopeNameReader = new DrizzleScopeNameReader(db);
    const activityReader = new DrizzleUserActivityReader(db);
    listAdmin = new ListUsersAdmin(userAdminRepo, grantRepo);
    getDetail = new GetUserAdminDetail(
      userAdminRepo,
      grantRepo,
      orgReader,
      activityReader,
      scopeNameReader,
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await db.delete(auditLogTable);
    await db.delete(grantsTable);
    await db.delete(organizationMembersTable);
    await db.delete(organizationsTable);
    await db.delete(emergenciesTable);
    await db.delete(usersTable);
  });

  async function seedUser(
    id: string,
    name: string,
    email: string,
    opts: { lastLoginAt?: Date | null } = {},
  ): Promise<void> {
    await db.insert(usersTable).values({
      id,
      email,
      passwordHash: 'hash',
      name,
      isAdmin: false,
      lastLoginAt: opts.lastLoginAt ?? null,
    });
  }

  it('lists users with a deduplicated roles summary, sorted by name', async () => {
    await seedUser(USER_B, 'Zoe', 'zoe@example.org', {
      lastLoginAt: new Date('2026-06-01T12:00:00.000Z'),
    });
    await seedUser(USER_A, 'Ana', 'ana@example.org');

    await db.insert(grantsTable).values([
      {
        id: randomUUID(),
        principalId: USER_B,
        principalType: 'user',
        roleId: 'org_admin',
        scopeType: 'organization',
        scopeId: ORG_ID,
      },
      {
        id: randomUUID(),
        principalId: USER_B,
        principalType: 'user',
        roleId: 'org_admin',
        scopeType: 'platform',
        scopeId: null,
      },
    ]);

    const list = await listAdmin.execute();
    expect(list.map((u) => u.name)).toEqual(['Ana', 'Zoe']);

    const zoe = list.find((u) => u.id === USER_B)!;
    expect(zoe.email).toBe('zoe@example.org');
    expect(zoe.lastLoginAt).toBe('2026-06-01T12:00:00.000Z');
    expect(zoe.roles).toEqual(['org_admin']);
    expect(zoe.grantCount).toBe(2);
    // created_at backfilled by the migration default → ISO string present
    expect(typeof zoe.createdAt).toBe('string');

    const ana = list.find((u) => u.id === USER_A)!;
    expect(ana.lastLoginAt).toBeNull();
    expect(ana.roles).toEqual([]);
  });

  it('returns full detail with resolved scope names, organizations and activity', async () => {
    await seedUser(USER_A, 'Ana Coord', 'ana@example.org', {
      lastLoginAt: new Date('2026-06-20T08:00:00.000Z'),
    });

    await db.insert(organizationsTable).values({
      id: ORG_ID,
      name: 'Cruz Roja',
      type: 'ngo',
    });
    await db.insert(organizationMembersTable).values({
      organizationId: ORG_ID,
      userId: USER_A,
      role: 'owner',
    });
    await db.insert(emergenciesTable).values({
      id: EMERGENCY_ID,
      name: 'Terremoto Venezuela 2026',
      slug: `tv-${EMERGENCY_ID.slice(0, 8)}`,
      country: 'VE',
      status: 'active',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await db.insert(grantsTable).values([
      {
        id: randomUUID(),
        principalId: USER_A,
        principalType: 'user',
        roleId: 'emergency_coordinator',
        scopeType: 'emergency',
        scopeId: EMERGENCY_ID,
      },
      {
        id: randomUUID(),
        principalId: USER_A,
        principalType: 'user',
        roleId: 'org_admin',
        scopeType: 'organization',
        scopeId: ORG_ID,
      },
    ]);

    await db.insert(auditLogTable).values({
      id: randomUUID(),
      actorUserId: USER_A,
      actorName: 'Ana Coord',
      action: 'resource.verify',
      entityType: 'resource',
      entityId: randomUUID(),
      emergencyId: EMERGENCY_ID,
      method: 'POST',
      path: '/resources/x/verify',
      statusCode: 200,
      createdAt: new Date('2026-06-19T10:00:00.000Z'),
    });

    const detail = await getDetail.execute({ userId: USER_A });

    expect(detail.email).toBe('ana@example.org');
    expect(detail.lastLoginAt).toBe('2026-06-20T08:00:00.000Z');

    expect(detail.grants).toHaveLength(2);
    const emGrant = detail.grants.find((g) => g.scopeType === 'emergency')!;
    expect(emGrant.scopeName).toBe('Terremoto Venezuela 2026');
    const orgGrant = detail.grants.find((g) => g.scopeType === 'organization')!;
    expect(orgGrant.scopeName).toBe('Cruz Roja');

    expect(detail.organizations).toEqual([
      { organizationId: ORG_ID, organizationName: 'Cruz Roja', role: 'owner' },
    ]);

    expect(detail.activity).toHaveLength(1);
    expect(detail.activity[0].action).toBe('resource.verify');
    expect(detail.activity[0].emergencyId).toBe(EMERGENCY_ID);
  });

  it('throws UserNotFoundError for an unknown id', async () => {
    await expect(
      getDetail.execute({ userId: '00000000-0000-4000-8000-0000000000ff' }),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });
});
