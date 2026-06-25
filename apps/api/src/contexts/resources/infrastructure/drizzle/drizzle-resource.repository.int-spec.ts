import { createDb, Db } from '../../../../shared/db';
import { resourcesTable } from './schema';
import { DrizzleResourceRepository } from './drizzle-resource.repository';
import { Resource } from '../../domain/resource';
import { ResourceId } from '../../domain/resource-id';
import { EmergencyId } from '../../domain/emergency-id';
import { ResourceType, ResourceSide, VerificationLevel, PublicStatus } from '../../domain/resource-enums';
import type { Pool } from 'pg';

const URL = process.env.DATABASE_URL ?? 'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';
const EM = '11111111-1111-4111-8111-111111111111';

describe('DrizzleResourceRepository (integration)', () => {
  let db: Db;
  let pool: Pool;
  let repo: DrizzleResourceRepository;

  beforeAll(() => {
    ({ db, pool } = createDb(URL));
    repo = new DrizzleResourceRepository(db);
  });
  afterAll(async () => { await pool.end(); });
  beforeEach(async () => { await db.delete(resourcesTable); });

  it('round-trips an aggregate through Postgres', async () => {
    const r = Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(EM),
      type: ResourceType.Warehouse,
      side: ResourceSide.Origin,
      name: 'Almacén Sur',
    });
    await repo.save(r);
    const found = await repo.findById(r.id);
    expect(found?.name).toBe('Almacén Sur');
    expect(found?.verificationLevel).toBe(VerificationLevel.Unverified);
  });

  it('findPendingByEmergency filters by emergency and status', async () => {
    const pending = Resource.register({ id: ResourceId.create(), emergencyId: EmergencyId.fromString(EM), type: ResourceType.CollectionPoint, side: ResourceSide.Origin, name: 'P' });
    const verified = Resource.register({ id: ResourceId.create(), emergencyId: EmergencyId.fromString(EM), type: ResourceType.CollectionPoint, side: ResourceSide.Origin, name: 'V' });
    verified.verify(VerificationLevel.Verified, 'c1');
    await repo.save(pending);
    await repo.save(verified);
    const result = await repo.findPendingByEmergency(EmergencyId.fromString(EM));
    expect(result.map((x) => x.name)).toEqual(['P']);
  });

  it('findActiveByEmergency returns only published resources and excludes them from pending', async () => {
    const active = Resource.register({ id: ResourceId.create(), emergencyId: EmergencyId.fromString(EM), type: ResourceType.CollectionPoint, side: ResourceSide.Origin, name: 'Active' });
    active.verify(VerificationLevel.Verified, 'c1');
    active.publish();
    const pending = Resource.register({ id: ResourceId.create(), emergencyId: EmergencyId.fromString(EM), type: ResourceType.CollectionPoint, side: ResourceSide.Origin, name: 'Pending' });
    await repo.save(active);
    await repo.save(pending);

    const activeResult = await repo.findActiveByEmergency(EmergencyId.fromString(EM));
    expect(activeResult.map((x) => x.name)).toEqual(['Active']);
    expect(activeResult[0].publicStatus).toBe(PublicStatus.Active);

    const pendingResult = await repo.findPendingByEmergency(EmergencyId.fromString(EM));
    expect(pendingResult.map((x) => x.name)).toEqual(['Pending']);
  });
});
