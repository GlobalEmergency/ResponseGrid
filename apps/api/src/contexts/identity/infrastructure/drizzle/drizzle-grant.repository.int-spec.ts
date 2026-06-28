import { createDb, Db } from '../../../../shared/db';
import { grantsTable } from './schema';
import { DrizzleGrantRepository } from './drizzle-grant.repository';
import { Grant } from '../../domain/authorization/grant';
import { ScopeRef } from '../../domain/authorization/scope-ref';
import type { Pool } from 'pg';

const URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';
const PRINCIPAL = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const EM_ID = '11111111-1111-4111-8111-111111111111';

describe('DrizzleGrantRepository (integration)', () => {
  let db: Db;
  let pool: Pool;
  let repo: DrizzleGrantRepository;

  beforeAll(() => {
    ({ db, pool } = createDb(URL));
    repo = new DrizzleGrantRepository(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await db.delete(grantsTable);
  });

  it('saves and finds an emergency-scoped grant by principal', async () => {
    const grant = Grant.create({
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      principalId: PRINCIPAL,
      roleId: 'emergency_coordinator',
      scope: ScopeRef.emergency(EM_ID),
    });
    await repo.save(grant);

    const found = await repo.findByPrincipal(PRINCIPAL);
    expect(found).toHaveLength(1);
    expect(found[0].roleId).toBe('emergency_coordinator');
    expect(found[0].scope.equals(ScopeRef.emergency(EM_ID))).toBe(true);
  });

  it('round-trips an entity scope (entityType preserved)', async () => {
    const grant = Grant.create({
      id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      principalId: PRINCIPAL,
      roleId: 'group_manager',
      scope: ScopeRef.entity('shipment', 's-1'),
    });
    await repo.save(grant);

    const [found] = await repo.findByPrincipal(PRINCIPAL);
    expect(found.scope.equals(ScopeRef.entity('shipment', 's-1'))).toBe(true);
  });

  it('persists expiry (break-glass / temporary grants)', async () => {
    const expiresAt = new Date('2030-01-01T00:00:00.000Z');
    const grant = Grant.create({
      id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      principalId: PRINCIPAL,
      roleId: 'viewer',
      scope: ScopeRef.platform(),
      expiresAt,
    });
    await repo.save(grant);

    const [found] = await repo.findByPrincipal(PRINCIPAL);
    expect(found.expiresAt?.toISOString()).toBe(expiresAt.toISOString());
  });

  it('returns multiple grants for the same principal (multi-role)', async () => {
    await repo.save(
      Grant.create({
        id: '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        principalId: PRINCIPAL,
        roleId: 'emergency_coordinator',
        scope: ScopeRef.emergency(EM_ID),
      }),
    );
    await repo.save(
      Grant.create({
        id: '22222222-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        principalId: PRINCIPAL,
        roleId: 'group_manager',
        scope: ScopeRef.group('grp-1'),
      }),
    );

    const found = await repo.findByPrincipal(PRINCIPAL);
    expect(found).toHaveLength(2);
  });

  it('deleteById removes a grant', async () => {
    const id = '33333333-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    await repo.save(
      Grant.create({
        id,
        principalId: PRINCIPAL,
        roleId: 'viewer',
        scope: ScopeRef.platform(),
      }),
    );
    await repo.deleteById(id);
    expect(await repo.findByPrincipal(PRINCIPAL)).toHaveLength(0);
  });
});
