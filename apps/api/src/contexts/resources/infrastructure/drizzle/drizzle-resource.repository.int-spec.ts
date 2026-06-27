import { createDb, Db } from '../../../../shared/db';
import { resourcesTable } from './schema';
import { DrizzleResourceRepository } from './drizzle-resource.repository';
import { Resource } from '../../domain/resource';
import { ResourceId } from '../../domain/resource-id';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import {
  ResourceType,
  ResourceStage,
  VerificationLevel,
  PublicStatus,
} from '../../domain/resource-enums';
import { Location } from '../../../../shared/domain/location';
import type { Pool } from 'pg';

const OWNER_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

const URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';
const EM = '11111111-1111-4111-8111-111111111111';
const baseLocation = Location.create({
  address: 'Calle Test 1, Sevilla',
  latitude: 37.3886,
  longitude: -5.9823,
});

describe('DrizzleResourceRepository (integration)', () => {
  let db: Db;
  let pool: Pool;
  let repo: DrizzleResourceRepository;

  beforeAll(() => {
    ({ db, pool } = createDb(URL));
    repo = new DrizzleResourceRepository(db);
  });
  afterAll(async () => {
    await pool.end();
  });
  beforeEach(async () => {
    await db.delete(resourcesTable);
  });

  it('round-trips an aggregate through Postgres', async () => {
    const r = Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(EM),
      type: ResourceType.Warehouse,
      stage: ResourceStage.Origin,
      name: 'Almacén Sur',
      location: baseLocation,
      ownerUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    });
    await repo.save(r);
    const found = await repo.findById(r.id);
    expect(found?.name).toBe('Almacén Sur');
    expect(found?.stage).toBe(ResourceStage.Origin);
    expect(found?.location.address).toBe('Calle Test 1, Sevilla');
    expect(found?.ownerUserId).toBe('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(found?.ownerOrganizationId).toBeNull();
    expect(found?.verificationLevel).toBe(VerificationLevel.Unverified);
  });

  it('round-trips resource with description and ownerOrganizationId', async () => {
    const r = Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(EM),
      type: ResourceType.CollectionAndDelivery,
      stage: ResourceStage.Intermediate,
      name: 'Punto Mixto',
      description: 'Recogida y entrega central',
      location: baseLocation,
      ownerUserId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      ownerOrganizationId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    });
    await repo.save(r);
    const found = await repo.findById(r.id);
    expect(found?.description).toBe('Recogida y entrega central');
    expect(found?.ownerOrganizationId).toBe(
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    );
    expect(found?.stage).toBe(ResourceStage.Intermediate);
  });

  it('findPendingByEmergency filters by emergency and status', async () => {
    const pending = Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(EM),
      type: ResourceType.CollectionPoint,
      stage: ResourceStage.Origin,
      name: 'P',
      location: baseLocation,
      ownerUserId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    });
    const verified = Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(EM),
      type: ResourceType.CollectionPoint,
      stage: ResourceStage.Origin,
      name: 'V',
      location: baseLocation,
      ownerUserId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    });
    verified.verify(VerificationLevel.Verified, 'c1');
    await repo.save(pending);
    await repo.save(verified);
    const result = await repo.findPendingByEmergency(
      EmergencyId.fromString(EM),
    );
    expect(result.map((x) => x.name)).toEqual(['P']);
  });

  it('findActiveByEmergency returns only published resources and excludes them from pending', async () => {
    const active = Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(EM),
      type: ResourceType.CollectionPoint,
      stage: ResourceStage.Origin,
      name: 'Active',
      location: baseLocation,
      ownerUserId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    });
    active.verify(VerificationLevel.Verified, 'c1');
    active.publish();
    const pending = Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(EM),
      type: ResourceType.CollectionPoint,
      stage: ResourceStage.Origin,
      name: 'Pending',
      location: baseLocation,
      ownerUserId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    });
    await repo.save(active);
    await repo.save(pending);

    const activeResult = await repo.findActiveByEmergency(
      EmergencyId.fromString(EM),
    );
    expect(activeResult.map((x) => x.name)).toEqual(['Active']);
    expect(activeResult[0].publicStatus).toBe(PublicStatus.Active);

    const pendingResult = await repo.findPendingByEmergency(
      EmergencyId.fromString(EM),
    );
    expect(pendingResult.map((x) => x.name)).toEqual(['Pending']);
  });

  it('countByEmergencyGroupedByPublicStatus returns zero map when no resources', async () => {
    const counts = await repo.countByEmergencyGroupedByPublicStatus(
      EmergencyId.fromString(EM),
    );
    expect(counts[PublicStatus.Hidden]).toBe(0);
    expect(counts[PublicStatus.Active]).toBe(0);
    expect(counts[PublicStatus.Saturated]).toBe(0);
    expect(counts[PublicStatus.Paused]).toBe(0);
    expect(counts[PublicStatus.Closed]).toBe(0);
  });

  it('countByEmergencyGroupedByPublicStatus counts Hidden and Active correctly', async () => {
    const hidden = Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(EM),
      type: ResourceType.CollectionPoint,
      stage: ResourceStage.Origin,
      name: 'Hidden',
      location: baseLocation,
      ownerUserId: OWNER_ID,
    });
    const active = Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(EM),
      type: ResourceType.CollectionPoint,
      stage: ResourceStage.Origin,
      name: 'Active',
      location: baseLocation,
      ownerUserId: OWNER_ID,
    });
    active.verify(VerificationLevel.Verified, 'c1');
    active.publish();

    await repo.save(hidden);
    await repo.save(active);

    const counts = await repo.countByEmergencyGroupedByPublicStatus(
      EmergencyId.fromString(EM),
    );
    expect(counts[PublicStatus.Hidden]).toBe(1);
    expect(counts[PublicStatus.Active]).toBe(1);
    expect(counts[PublicStatus.Saturated]).toBe(0);
  });

  it('findByOwnerAndEmergency returns only resources of the given owner', async () => {
    const OTHER_OWNER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbc';
    const owner = Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(EM),
      type: ResourceType.CollectionPoint,
      stage: ResourceStage.Origin,
      name: 'Owner Resource',
      location: baseLocation,
      ownerUserId: OWNER_ID,
    });
    const other = Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(EM),
      type: ResourceType.CollectionPoint,
      stage: ResourceStage.Origin,
      name: 'Other Resource',
      location: baseLocation,
      ownerUserId: OTHER_OWNER,
    });
    await repo.save(owner);
    await repo.save(other);

    const result = await repo.findByOwnerAndEmergency(
      OWNER_ID,
      EmergencyId.fromString(EM),
    );
    expect(result.map((r) => r.name)).toEqual(['Owner Resource']);
  });

  it('findVisibleByEmergency returns Active, Saturated, Paused but not Hidden or Closed', async () => {
    const active = Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(EM),
      type: ResourceType.CollectionPoint,
      stage: ResourceStage.Origin,
      name: 'Active',
      location: baseLocation,
      ownerUserId: OWNER_ID,
    });
    active.verify(VerificationLevel.Verified, 'c1');
    active.publish();

    const saturated = Resource.fromSnapshot({
      ...active.toSnapshot(),
      id: ResourceId.create().value,
      name: 'Saturated',
      publicStatus: PublicStatus.Saturated,
    });

    const paused = Resource.fromSnapshot({
      ...active.toSnapshot(),
      id: ResourceId.create().value,
      name: 'Paused',
      publicStatus: PublicStatus.Paused,
    });

    const hidden = Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(EM),
      type: ResourceType.CollectionPoint,
      stage: ResourceStage.Origin,
      name: 'Hidden',
      location: baseLocation,
      ownerUserId: OWNER_ID,
    });

    const closed = Resource.fromSnapshot({
      ...active.toSnapshot(),
      id: ResourceId.create().value,
      name: 'Closed',
      publicStatus: PublicStatus.Closed,
    });

    await repo.save(active);
    await repo.save(saturated);
    await repo.save(paused);
    await repo.save(hidden);
    await repo.save(closed);

    const result = await repo.findVisibleByEmergency(
      EmergencyId.fromString(EM),
    );
    const names = result.map((r) => r.name).sort();
    expect(names).toEqual(['Active', 'Paused', 'Saturated']);
  });

  it('countByEmergencyGroupedByPublicStatus ignores other emergencies', async () => {
    const OTHER_EM = '44444444-4444-4444-8444-444444444444';
    const mine = Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(EM),
      type: ResourceType.CollectionPoint,
      stage: ResourceStage.Origin,
      name: 'Mine',
      location: baseLocation,
      ownerUserId: OWNER_ID,
    });
    const other = Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(OTHER_EM),
      type: ResourceType.CollectionPoint,
      stage: ResourceStage.Origin,
      name: 'Other',
      location: baseLocation,
      ownerUserId: OWNER_ID,
    });
    await repo.save(mine);
    await repo.save(other);

    const counts = await repo.countByEmergencyGroupedByPublicStatus(
      EmergencyId.fromString(EM),
    );
    expect(counts[PublicStatus.Hidden]).toBe(1);
  });

  it('round-trips enriched fields through Postgres (Task 2)', async () => {
    const externalUpdatedAt = new Date('2026-06-27T00:00:00.000Z');
    const r = Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(EM),
      type: ResourceType.CollectionPoint,
      stage: ResourceStage.Origin,
      name: 'Acopio Venezuela',
      location: baseLocation,
      ownerUserId: OWNER_ID,
      accepts: ['water', 'food'],
      contact: '+58 212 555 0000',
      schedule: 'Lun-Vie 08-18',
      manager: 'Juan Pérez',
      country: 'VE',
      city: 'Caracas',
      provenance: {
        sourceName: 'acopiove.org',
        externalId: 'abc',
        externalUpdatedAt,
        raw: { x: 1 },
      },
    });

    await repo.save(r);
    const found = await repo.findById(r.id);

    expect(found).not.toBeNull();
    expect(found!.accepts).toEqual(['water', 'food']);
    expect(found!.contact).toBe('+58 212 555 0000');
    expect(found!.schedule).toBe('Lun-Vie 08-18');
    expect(found!.manager).toBe('Juan Pérez');
    expect(found!.country).toBe('VE');
    expect(found!.city).toBe('Caracas');
    expect(found!.provenance?.sourceName).toBe('acopiove.org');
    expect(found!.provenance?.externalId).toBe('abc');
    expect(found!.provenance?.externalUpdatedAt).toEqual(externalUpdatedAt);
    expect(found!.provenance?.raw).toEqual({ x: 1 });
  });

  it('round-trips resource with no enriched fields (defaults)', async () => {
    const r = Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(EM),
      type: ResourceType.Warehouse,
      stage: ResourceStage.Origin,
      name: 'Plain Resource',
      location: baseLocation,
      ownerUserId: OWNER_ID,
    });

    await repo.save(r);
    const found = await repo.findById(r.id);

    expect(found).not.toBeNull();
    expect(found!.accepts).toEqual([]);
    expect(found!.contact).toBeNull();
    expect(found!.schedule).toBeNull();
    expect(found!.manager).toBeNull();
    expect(found!.country).toBeNull();
    expect(found!.city).toBeNull();
    expect(found!.provenance).toBeNull();
  });
});
