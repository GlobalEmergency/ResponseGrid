import { createDb, Db } from '../../../../shared/db';
import { auditLogTable } from './schema';
import { DrizzleAuditRepository } from './drizzle-audit.repository';
import { AuditEntry } from '../../domain/audit-entry';
import type { Pool } from 'pg';
import { randomUUID } from 'node:crypto';

const URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';

const EM_A = '22222222-2222-4222-8222-222222222201';
const EM_B = '22222222-2222-4222-8222-222222222202';
const USER_A = '33333333-3333-4333-8333-333333333301';
const USER_B = '33333333-3333-4333-8333-333333333302';

function makeEntry(
  overrides: Partial<Parameters<typeof AuditEntry.create>[0]> = {},
): AuditEntry {
  return AuditEntry.create({
    id: randomUUID(),
    actorUserId: USER_A,
    action: 'resource.verify',
    entityType: 'resource',
    entityId: randomUUID(),
    emergencyId: EM_A,
    method: 'POST',
    path: '/resources/abc/verify',
    statusCode: 204,
    ...overrides,
  });
}

describe('DrizzleAuditRepository (integration)', () => {
  let db: Db;
  let pool: Pool;
  let repo: DrizzleAuditRepository;

  beforeAll(() => {
    ({ db, pool } = createDb(URL));
    repo = new DrizzleAuditRepository(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await db.delete(auditLogTable);
  });

  it('saves an entry and retrieves it via findAll', async () => {
    const entry = makeEntry();
    await repo.save(entry);

    const results = await repo.findAll({});
    expect(results).toHaveLength(1);
    const found = results[0];
    expect(found.id).toBe(entry.id);
    expect(found.actorUserId).toBe(USER_A);
    expect(found.action).toBe('resource.verify');
    expect(found.entityType).toBe('resource');
    expect(found.emergencyId).toBe(EM_A);
    expect(found.statusCode).toBe(204);
  });

  it('findAll with no entries returns empty array', async () => {
    const results = await repo.findAll({});
    expect(results).toHaveLength(0);
  });

  it('filters by emergencyId', async () => {
    await repo.save(makeEntry({ emergencyId: EM_A }));
    await repo.save(makeEntry({ emergencyId: EM_B }));

    const results = await repo.findAll({ emergencyId: EM_A });
    expect(results).toHaveLength(1);
    expect(results[0].emergencyId).toBe(EM_A);
  });

  it('filters by actorUserId', async () => {
    await repo.save(makeEntry({ actorUserId: USER_A }));
    await repo.save(makeEntry({ actorUserId: USER_B }));

    const results = await repo.findAll({ actorUserId: USER_B });
    expect(results).toHaveLength(1);
    expect(results[0].actorUserId).toBe(USER_B);
  });

  it('filters by entityType', async () => {
    await repo.save(makeEntry({ entityType: 'resource' }));
    await repo.save(makeEntry({ entityType: 'need' }));

    const results = await repo.findAll({ entityType: 'need' });
    expect(results).toHaveLength(1);
    expect(results[0].entityType).toBe('need');
  });

  it('returns results ordered descending by createdAt', async () => {
    // Insert in order with slight delay handled by UUID ordering (same ms)
    // We use explicit createdAt via fromSnapshot
    const older = AuditEntry.fromSnapshot({
      id: randomUUID(),
      actorUserId: USER_A,
      actorName: null,
      action: 'resource.create',
      entityType: 'resource',
      entityId: randomUUID(),
      emergencyId: EM_A,
      method: 'POST',
      path: '/resources',
      statusCode: 201,
      reason: null,
      changes: null,
      targetStatus: null,
      createdAt: new Date('2025-01-01T00:00:00Z'),
    });
    const newer = AuditEntry.fromSnapshot({
      id: randomUUID(),
      actorUserId: USER_A,
      actorName: null,
      action: 'resource.verify',
      entityType: 'resource',
      entityId: randomUUID(),
      emergencyId: EM_A,
      method: 'POST',
      path: '/resources/x/verify',
      statusCode: 204,
      reason: null,
      changes: null,
      targetStatus: null,
      createdAt: new Date('2025-01-02T00:00:00Z'),
    });

    await repo.save(older);
    await repo.save(newer);

    const results = await repo.findAll({});
    expect(results[0].id).toBe(newer.id);
    expect(results[1].id).toBe(older.id);
  });

  it('respects limit and offset', async () => {
    for (let i = 0; i < 5; i++) {
      await repo.save(makeEntry());
    }
    const page1 = await repo.findAll({ limit: 2, offset: 0 });
    const page2 = await repo.findAll({ limit: 2, offset: 2 });
    expect(page1).toHaveLength(2);
    expect(page2).toHaveLength(2);
    // no overlap
    const ids1 = new Set(page1.map((e) => e.id));
    const ids2 = new Set(page2.map((e) => e.id));
    for (const id of ids2) expect(ids1.has(id)).toBe(false);
  });

  it('saves entry with null actorUserId (anonymous)', async () => {
    const entry = makeEntry({ actorUserId: null });
    await repo.save(entry);
    const results = await repo.findAll({});
    expect(results[0].actorUserId).toBeNull();
  });

  it('round-trips the traceability fields (actorName, reason, changes, targetStatus)', async () => {
    const entry = makeEntry({
      action: 'need.discard',
      entityType: 'need',
      actorName: 'Coordinadora Ana',
      reason: 'Duplicada de otra petición ya validada',
      changes: [{ field: 'status', before: 'pending', after: 'rejected' }],
      targetStatus: 'rejected',
    });
    await repo.save(entry);

    const [found] = await repo.findAll({});
    expect(found.actorName).toBe('Coordinadora Ana');
    expect(found.reason).toBe('Duplicada de otra petición ya validada');
    expect(found.targetStatus).toBe('rejected');
    expect(found.changes).toEqual([
      { field: 'status', before: 'pending', after: 'rejected' },
    ]);
  });
});
