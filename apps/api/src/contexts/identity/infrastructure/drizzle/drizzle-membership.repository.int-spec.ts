import { createDb, Db } from '../../../../shared/db';
import { usersTable, membershipsTable } from './schema';
import { DrizzleMembershipRepository } from './drizzle-membership.repository';
import { Membership } from '../../domain/membership';
import { UserId } from '../../domain/user-id';
import { Role } from '../../domain/role';
import type { Pool } from 'pg';

const URL = process.env.DATABASE_URL ?? 'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';
const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const EM_ID = '11111111-1111-4111-8111-111111111111';
const MEMBERSHIP_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

describe('DrizzleMembershipRepository (integration)', () => {
  let db: Db;
  let pool: Pool;
  let repo: DrizzleMembershipRepository;

  beforeAll(() => {
    ({ db, pool } = createDb(URL));
    repo = new DrizzleMembershipRepository(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await db.delete(membershipsTable);
    await db.delete(usersTable);
  });

  it('saves and finds memberships by user', async () => {
    const membership = Membership.create({
      id: MEMBERSHIP_ID,
      userId: UserId.fromString(USER_ID),
      emergencyId: EM_ID,
      role: Role.Coordinator,
    });

    await repo.save(membership);
    const results = await repo.findByUser(UserId.fromString(USER_ID));

    expect(results).toHaveLength(1);
    expect(results[0].role).toBe(Role.Coordinator);
    expect(results[0].emergencyId).toBe(EM_ID);
  });

  it('hasRole returns true when role exists', async () => {
    const membership = Membership.create({
      id: MEMBERSHIP_ID,
      userId: UserId.fromString(USER_ID),
      emergencyId: EM_ID,
      role: Role.Coordinator,
    });
    await repo.save(membership);

    const result = await repo.hasRole(UserId.fromString(USER_ID), EM_ID, Role.Coordinator);
    expect(result).toBe(true);
  });

  it('hasRole returns false when role does not exist', async () => {
    const result = await repo.hasRole(UserId.fromString(USER_ID), EM_ID, Role.Coordinator);
    expect(result).toBe(false);
  });

  it('hasRole returns false for different emergency', async () => {
    const membership = Membership.create({
      id: MEMBERSHIP_ID,
      userId: UserId.fromString(USER_ID),
      emergencyId: EM_ID,
      role: Role.Coordinator,
    });
    await repo.save(membership);

    const result = await repo.hasRole(
      UserId.fromString(USER_ID),
      '22222222-2222-4222-8222-222222222222',
      Role.Coordinator,
    );
    expect(result).toBe(false);
  });

  it('upserts on duplicate (user, emergency, role)', async () => {
    const membership = Membership.create({
      id: MEMBERSHIP_ID,
      userId: UserId.fromString(USER_ID),
      emergencyId: EM_ID,
      role: Role.Coordinator,
    });
    await repo.save(membership);
    // Saving again should not throw
    await repo.save(membership);
    const results = await repo.findByUser(UserId.fromString(USER_ID));
    expect(results).toHaveLength(1);
  });
});
