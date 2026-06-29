import { eq, sql } from 'drizzle-orm';
import { createDb, Db } from '../../../../shared/db';
import { resourcesTable } from './schema';
import { emergenciesTable } from '../../../emergencies/infrastructure/drizzle/schema';
import { DrizzleResourceRepository } from './drizzle-resource.repository';
import { Resource } from '../../domain/resource';
import { SupplyLine } from '../../../supplies/domain/supply-line';
import { Category } from '../../../supplies/domain/category';
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

  it('round-trips declared inventory items and replaces them on re-save', async () => {
    const id = ResourceId.create();
    const withItems = Resource.register({
      id,
      emergencyId: EmergencyId.fromString(EM),
      type: ResourceType.Warehouse,
      stage: ResourceStage.Origin,
      name: 'Almacén con inventario',
      location: baseLocation,
      ownerUserId: OWNER_ID,
      items: [
        SupplyLine.create({
          name: 'Agua',
          quantity: 200,
          unit: 'litros',
          category: Category.Water,
        }),
        SupplyLine.create({
          name: 'Mantas',
          quantity: 50,
          unit: null,
          category: Category.Shelter,
          presentation: null,
        }),
      ],
    });
    await repo.save(withItems);

    const found = await repo.findById(id);
    expect(found?.items).toHaveLength(2);
    expect(found?.items.map((i) => i.toSnapshot())).toEqual(
      expect.arrayContaining([
        {
          name: 'Agua',
          quantity: 200,
          unit: 'litros',
          category: Category.Water,
          presentation: null,
        },
        {
          name: 'Mantas',
          quantity: 50,
          unit: null,
          category: Category.Shelter,
          presentation: null,
        },
      ]),
    );

    // Re-save with a different inventory: the previous lines must be replaced,
    // not accumulated.
    const reSaved = Resource.fromSnapshot({
      ...found!.toSnapshot(),
      items: [
        {
          name: 'Arroz',
          quantity: 30,
          unit: 'kg',
          category: Category.Food,
          presentation: null,
        },
      ],
    });
    await repo.save(reSaved);

    const reFound = await repo.findById(id);
    expect(reFound?.items.map((i) => i.toSnapshot())).toEqual([
      {
        name: 'Arroz',
        quantity: 30,
        unit: 'kg',
        category: Category.Food,
        presentation: null,
      },
    ]);
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

  it('findPendingByEmergencyPaged filters by type and free text, and paginates', async () => {
    const acopio = Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(EM),
      type: ResourceType.CollectionPoint,
      stage: ResourceStage.Origin,
      name: 'Cruz Roja Centro',
      location: baseLocation,
      ownerUserId: OWNER_ID,
    });
    const almacen = Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(EM),
      type: ResourceType.Warehouse,
      stage: ResourceStage.Intermediate,
      name: 'Almacén Cáritas',
      location: baseLocation,
      ownerUserId: OWNER_ID,
    });
    const verified = Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(EM),
      type: ResourceType.CollectionPoint,
      stage: ResourceStage.Origin,
      name: 'Cruz Roja Verificada',
      location: baseLocation,
      ownerUserId: OWNER_ID,
    });
    verified.verify(VerificationLevel.Verified, 'c1');
    await repo.save(acopio);
    await repo.save(almacen);
    await repo.save(verified);

    // Type filter narrows to warehouses (and never returns verified rows).
    const byType = await repo.findPendingByEmergencyPaged(
      EmergencyId.fromString(EM),
      { page: 1, limit: 50, type: ResourceType.Warehouse },
    );
    expect(byType.total).toBe(1);
    expect(byType.items.map((x) => x.name)).toEqual(['Almacén Cáritas']);

    // Free-text search matches the still-pending "Cruz Roja Centro" only.
    const byText = await repo.findPendingByEmergencyPaged(
      EmergencyId.fromString(EM),
      { page: 1, limit: 50, q: 'cruz roja' },
    );
    expect(byText.total).toBe(1);
    expect(byText.items.map((x) => x.name)).toEqual(['Cruz Roja Centro']);

    // Pagination reports the full pending total but returns one item per page.
    const page1 = await repo.findPendingByEmergencyPaged(
      EmergencyId.fromString(EM),
      { page: 1, limit: 1 },
    );
    expect(page1.total).toBe(2);
    expect(page1.items).toHaveLength(1);
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

  it('round-trips the final-recipient role through Postgres (#60)', async () => {
    const r = Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(EM),
      type: ResourceType.Venue,
      stage: ResourceStage.Destination,
      name: 'Hospital Central',
      location: baseLocation,
      ownerUserId: OWNER_ID,
      isFinalRecipient: true,
      recipientType: 'hospital',
    });

    await repo.save(r);
    const found = await repo.findById(r.id);

    expect(found).not.toBeNull();
    expect(found!.isFinalRecipient).toBe(true);
    expect(found!.recipientType).toBe('hospital');
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

  it('externalId round-trips as a real string, not empty-string fallback (Fix wave 1)', async () => {
    const r = Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(EM),
      type: ResourceType.CollectionPoint,
      stage: ResourceStage.Origin,
      name: 'Provenance Check',
      location: baseLocation,
      ownerUserId: OWNER_ID,
      provenance: {
        sourceName: 'test-source',
        externalId: 'ext-id-42',
        externalUpdatedAt: null,
        raw: null,
      },
    });

    await repo.save(r);
    const found = await repo.findById(r.id);

    expect(found!.provenance).not.toBeNull();
    expect(found!.provenance!.externalId).toBe('ext-id-42');
    // Confirm it is exactly the stored value and NOT an empty-string fallback
    expect(found!.provenance!.externalId).not.toBe('');
  });

  it('findByExternal returns the resource matching sourceName + externalId', async () => {
    const SOURCE = 'acopiove';
    const EXT_ID = 'ext-find-by-external-test';
    const r = Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(EM),
      type: ResourceType.CollectionPoint,
      stage: ResourceStage.Origin,
      name: 'Acopio Externo',
      location: baseLocation,
      ownerUserId: OWNER_ID,
      provenance: {
        sourceName: SOURCE,
        externalId: EXT_ID,
        externalUpdatedAt: null,
        raw: { test: true },
      },
    });
    await repo.save(r);

    const found = await repo.findByExternal(SOURCE, EXT_ID);
    expect(found).not.toBeNull();
    expect(found!.id.value).toBe(r.id.value);
    expect(found!.provenance?.sourceName).toBe(SOURCE);
    expect(found!.provenance?.externalId).toBe(EXT_ID);
  });

  it('findByExternal returns null when no match', async () => {
    const result = await repo.findByExternal(
      'nonexistent-source',
      'nonexistent-id',
    );
    expect(result).toBeNull();
  });

  it('findByExternal does not match wrong sourceName', async () => {
    const r = Resource.register({
      id: ResourceId.create(),
      emergencyId: EmergencyId.fromString(EM),
      type: ResourceType.CollectionPoint,
      stage: ResourceStage.Origin,
      name: 'Scoped Source',
      location: baseLocation,
      ownerUserId: OWNER_ID,
      provenance: {
        sourceName: 'source-a',
        externalId: 'shared-ext-id',
        externalUpdatedAt: null,
        raw: null,
      },
    });
    await repo.save(r);

    const result = await repo.findByExternal('source-b', 'shared-ext-id');
    expect(result).toBeNull();
  });

  // ─── Task 4: findVisiblePaged + facets ─────────────────────────────────────

  describe('findVisiblePaged', () => {
    it('returns paged items with correct total', async () => {
      const makeVisible = (name: string) => {
        const base = Resource.register({
          id: ResourceId.create(),
          emergencyId: EmergencyId.fromString(EM),
          type: ResourceType.CollectionPoint,
          stage: ResourceStage.Origin,
          name,
          location: baseLocation,
          ownerUserId: OWNER_ID,
        });
        return Resource.fromSnapshot({
          ...base.toSnapshot(),
          verificationLevel: VerificationLevel.Verified,
          publicStatus: PublicStatus.Active,
          createdAt: new Date(),
        });
      };

      for (let i = 1; i <= 5; i++) {
        await repo.save(makeVisible(`Visible ${i}`));
      }
      // one hidden (default)
      await repo.save(
        Resource.register({
          id: ResourceId.create(),
          emergencyId: EmergencyId.fromString(EM),
          type: ResourceType.CollectionPoint,
          stage: ResourceStage.Origin,
          name: 'Hidden One',
          location: baseLocation,
          ownerUserId: OWNER_ID,
        }),
      );

      const { items, total } = await repo.findVisiblePaged(
        EmergencyId.fromString(EM),
        { page: 1, limit: 2 },
      );
      expect(items).toHaveLength(2);
      expect(total).toBe(5);
    });

    it('excludes active-but-unverified (ingested) points — #94', async () => {
      const verified = Resource.fromSnapshot({
        ...Resource.register({
          id: ResourceId.create(),
          emergencyId: EmergencyId.fromString(EM),
          type: ResourceType.CollectionPoint,
          stage: ResourceStage.Origin,
          name: 'Verified',
          location: baseLocation,
          ownerUserId: OWNER_ID,
        }).toSnapshot(),
        verificationLevel: VerificationLevel.Verified,
        publicStatus: PublicStatus.Active,
        createdAt: new Date(),
      });
      // Active yet Unverified, exactly as the external ingest writes it.
      const unverified = Resource.fromSnapshot({
        ...Resource.register({
          id: ResourceId.create(),
          emergencyId: EmergencyId.fromString(EM),
          type: ResourceType.CollectionPoint,
          stage: ResourceStage.Origin,
          name: 'Ingested Unverified',
          location: baseLocation,
          ownerUserId: OWNER_ID,
        }).toSnapshot(),
        verificationLevel: VerificationLevel.Unverified,
        publicStatus: PublicStatus.Active,
        createdAt: new Date(),
      });
      await repo.save(verified);
      await repo.save(unverified);

      const { items, total } = await repo.findVisiblePaged(
        EmergencyId.fromString(EM),
        { page: 1, limit: 10 },
      );
      expect(total).toBe(1);
      expect(items.map((r) => r.name)).toEqual(['Verified']);
    });

    it('orders points without contact to the end (#58)', async () => {
      const makeWithContact = (name: string, contact: string | null) =>
        Resource.fromSnapshot({
          ...Resource.register({
            id: ResourceId.create(),
            emergencyId: EmergencyId.fromString(EM),
            type: ResourceType.CollectionPoint,
            stage: ResourceStage.Origin,
            name,
            location: baseLocation,
            ownerUserId: OWNER_ID,
            contact,
          }).toSnapshot(),
          verificationLevel: VerificationLevel.Verified,
          publicStatus: PublicStatus.Active,
          createdAt: new Date(),
        });

      // Insert in an order that is NOT the desired output order.
      await repo.save(makeWithContact('Zeta sin contacto', null));
      await repo.save(makeWithContact('Alfa con contacto', '+58 212 555 0001'));
      await repo.save(makeWithContact('Beta sin contacto', null));
      await repo.save(
        makeWithContact('Gamma con contacto', '+58 212 555 0002'),
      );

      const { items } = await repo.findVisiblePaged(
        EmergencyId.fromString(EM),
        {
          page: 1,
          limit: 10,
        },
      );

      const names = items.map((r) => r.name);
      // Points with contact come first (sorted by name), then the ones without.
      expect(names).toEqual([
        'Alfa con contacto',
        'Gamma con contacto',
        'Beta sin contacto',
        'Zeta sin contacto',
      ]);
    });

    it('filters by category (accepts @> ARRAY[category])', async () => {
      const withWater = Resource.fromSnapshot({
        ...Resource.register({
          id: ResourceId.create(),
          emergencyId: EmergencyId.fromString(EM),
          type: ResourceType.CollectionPoint,
          stage: ResourceStage.Origin,
          name: 'Water Resource',
          location: baseLocation,
          ownerUserId: OWNER_ID,
          accepts: ['water', 'food'],
        }).toSnapshot(),
        verificationLevel: VerificationLevel.Verified,
        publicStatus: PublicStatus.Active,
        createdAt: new Date(),
      });
      const withFood = Resource.fromSnapshot({
        ...Resource.register({
          id: ResourceId.create(),
          emergencyId: EmergencyId.fromString(EM),
          type: ResourceType.CollectionPoint,
          stage: ResourceStage.Origin,
          name: 'Food Only',
          location: baseLocation,
          ownerUserId: OWNER_ID,
          accepts: ['food'],
        }).toSnapshot(),
        verificationLevel: VerificationLevel.Verified,
        publicStatus: PublicStatus.Active,
        createdAt: new Date(),
      });

      await repo.save(withWater);
      await repo.save(withFood);

      const { items, total } = await repo.findVisiblePaged(
        EmergencyId.fromString(EM),
        { page: 1, limit: 10, category: 'water' },
      );
      expect(items.every((r) => r.accepts.includes('water'))).toBe(true);
      expect(total).toBe(1);
      expect(items[0].name).toBe('Water Resource');
    });

    describe('q text search', () => {
      const makeSearchResource = (
        name: string,
        city: string | null,
        accepts: string[] = [],
      ) =>
        Resource.fromSnapshot({
          ...Resource.register({
            id: ResourceId.create(),
            emergencyId: EmergencyId.fromString(EM),
            type: ResourceType.CollectionPoint,
            stage: ResourceStage.Origin,
            name,
            location: Location.create({
              address: `${name} street`,
              latitude: 37.3886,
              longitude: -5.9823,
            }),
            ownerUserId: OWNER_ID,
            accepts,
            city: city ?? undefined,
          }).toSnapshot(),
          verificationLevel: VerificationLevel.Verified,
          publicStatus: PublicStatus.Active,
          createdAt: new Date(),
        });

      it('filters by name (case-insensitive)', async () => {
        await repo.save(makeSearchResource('Caritas Madrid', 'Madrid'));
        await repo.save(makeSearchResource('Cruz Roja', 'Sevilla'));
        await repo.save(makeSearchResource('Banco de Alimentos', 'Barcelona'));

        const { items, total } = await repo.findVisiblePaged(
          EmergencyId.fromString(EM),
          { page: 1, limit: 10, q: 'caritas' },
        );
        expect(total).toBe(1);
        expect(items[0].name).toBe('Caritas Madrid');
      });

      it('filters by city (case-insensitive, uppercase query)', async () => {
        await repo.save(makeSearchResource('Caritas Madrid', 'Madrid'));
        await repo.save(makeSearchResource('Cruz Roja', 'Sevilla'));
        await repo.save(makeSearchResource('Banco de Alimentos', 'Barcelona'));

        const { items, total } = await repo.findVisiblePaged(
          EmergencyId.fromString(EM),
          { page: 1, limit: 10, q: 'MADRID' },
        );
        expect(total).toBe(1);
        expect(items[0].name).toBe('Caritas Madrid');
      });

      it('is combinable with category filter', async () => {
        await repo.save(
          makeSearchResource('Caritas Madrid', 'Madrid', ['food']),
        );
        await repo.save(makeSearchResource('Cruz Roja', 'Sevilla', ['water']));

        const { items, total } = await repo.findVisiblePaged(
          EmergencyId.fromString(EM),
          { page: 1, limit: 10, q: 'caritas', category: 'food' },
        );
        expect(total).toBe(1);
        expect(items[0].name).toBe('Caritas Madrid');
      });

      it('returns empty when no match', async () => {
        await repo.save(makeSearchResource('Caritas Madrid', 'Madrid'));

        const { items, total } = await repo.findVisiblePaged(
          EmergencyId.fromString(EM),
          { page: 1, limit: 10, q: 'xyz_notexist' },
        );
        expect(items).toHaveLength(0);
        expect(total).toBe(0);
      });

      it('hidden resource with matching name is NOT returned', async () => {
        // visible caritas
        await repo.save(makeSearchResource('Caritas Madrid', 'Madrid'));
        // hidden caritas
        const hidden = Resource.register({
          id: ResourceId.create(),
          emergencyId: EmergencyId.fromString(EM),
          type: ResourceType.CollectionPoint,
          stage: ResourceStage.Origin,
          name: 'Caritas Hidden',
          location: Location.create({
            address: 'Hidden street',
            latitude: 37.3886,
            longitude: -5.9823,
          }),
          ownerUserId: OWNER_ID,
        });
        await repo.save(hidden);

        const { items, total } = await repo.findVisiblePaged(
          EmergencyId.fromString(EM),
          { page: 1, limit: 10, q: 'caritas' },
        );
        expect(total).toBe(1);
        expect(items.map((r) => r.name)).toEqual(['Caritas Madrid']);
      });

      it('total reflects the count of matching items', async () => {
        await repo.save(makeSearchResource('Caritas Madrid', 'Madrid'));
        await repo.save(makeSearchResource('Caritas Sevilla', 'Sevilla'));
        await repo.save(makeSearchResource('Cruz Roja', 'Barcelona'));

        const { items, total } = await repo.findVisiblePaged(
          EmergencyId.fromString(EM),
          { page: 1, limit: 1, q: 'caritas' },
        );
        // Only one item returned due to limit=1, but total is the full count
        expect(items).toHaveLength(1);
        expect(total).toBe(2);
      });

      it('filters by address (case-insensitive)', async () => {
        await repo.save(makeSearchResource('Caritas Madrid', 'Madrid'));
        await repo.save(makeSearchResource('Cruz Roja', 'Sevilla'));
        await repo.save(makeSearchResource('Banco de Alimentos', 'Barcelona'));

        // "Banco de Alimentos" has address "Banco de Alimentos street"
        // "alimentos street" appears only in the address column, not in name or city
        const { items, total } = await repo.findVisiblePaged(
          EmergencyId.fromString(EM),
          { page: 1, limit: 10, q: 'alimentos street' },
        );
        expect(total).toBe(1);
        expect(items[0].name).toBe('Banco de Alimentos');
      });
    });

    it('filters by country', async () => {
      const ve = Resource.fromSnapshot({
        ...Resource.register({
          id: ResourceId.create(),
          emergencyId: EmergencyId.fromString(EM),
          type: ResourceType.CollectionPoint,
          stage: ResourceStage.Origin,
          name: 'VE Resource',
          location: baseLocation,
          ownerUserId: OWNER_ID,
          country: 'VE',
        }).toSnapshot(),
        verificationLevel: VerificationLevel.Verified,
        publicStatus: PublicStatus.Active,
        createdAt: new Date(),
      });
      const co = Resource.fromSnapshot({
        ...Resource.register({
          id: ResourceId.create(),
          emergencyId: EmergencyId.fromString(EM),
          type: ResourceType.CollectionPoint,
          stage: ResourceStage.Origin,
          name: 'CO Resource',
          location: baseLocation,
          ownerUserId: OWNER_ID,
          country: 'CO',
        }).toSnapshot(),
        verificationLevel: VerificationLevel.Verified,
        publicStatus: PublicStatus.Active,
        createdAt: new Date(),
      });

      await repo.save(ve);
      await repo.save(co);

      const { items, total } = await repo.findVisiblePaged(
        EmergencyId.fromString(EM),
        { page: 1, limit: 10, country: 'VE' },
      );
      expect(total).toBe(1);
      expect(items[0].name).toBe('VE Resource');
    });
  });

  describe('facets', () => {
    it('counts byCategory (unnesting accepts), byCountry, and total visible only', async () => {
      const makeResource = (
        name: string,
        accepts: string[],
        country: string | null,
        visible: boolean,
      ) => {
        const base = Resource.register({
          id: ResourceId.create(),
          emergencyId: EmergencyId.fromString(EM),
          type: ResourceType.CollectionPoint,
          stage: ResourceStage.Origin,
          name,
          location: baseLocation,
          ownerUserId: OWNER_ID,
          accepts,
          country: country ?? undefined,
        });
        if (visible) {
          return Resource.fromSnapshot({
            ...base.toSnapshot(),
            verificationLevel: VerificationLevel.Verified,
            publicStatus: PublicStatus.Active,
            createdAt: new Date(),
          });
        }
        return base; // hidden by default
      };

      // 2 visible with 'water', 1 with 'food', 1 hidden (should not count)
      await repo.save(makeResource('R1', ['water', 'food'], 'VE', true));
      await repo.save(makeResource('R2', ['water'], 'CO', true));
      await repo.save(makeResource('R3 hidden', ['water'], 'VE', false));

      const { byCategory, byCountry, total } = await repo.facets(
        EmergencyId.fromString(EM),
      );

      expect(total).toBe(2);
      expect(byCategory['water']).toBe(2); // R1 and R2
      expect(byCategory['food']).toBe(1); // R1 only
      expect(byCategory['water']).not.toBe(3); // R3 excluded
      expect(byCountry['VE']).toBe(1); // R1
      expect(byCountry['CO']).toBe(1); // R2
    });

    it('does not count active-but-unverified (ingested) points — #94', async () => {
      const verified = Resource.fromSnapshot({
        ...Resource.register({
          id: ResourceId.create(),
          emergencyId: EmergencyId.fromString(EM),
          type: ResourceType.CollectionPoint,
          stage: ResourceStage.Origin,
          name: 'Verified',
          location: baseLocation,
          ownerUserId: OWNER_ID,
          accepts: ['water'],
          country: 'VE',
        }).toSnapshot(),
        verificationLevel: VerificationLevel.Verified,
        publicStatus: PublicStatus.Active,
        createdAt: new Date(),
      });
      const unverified = Resource.fromSnapshot({
        ...Resource.register({
          id: ResourceId.create(),
          emergencyId: EmergencyId.fromString(EM),
          type: ResourceType.CollectionPoint,
          stage: ResourceStage.Origin,
          name: 'Ingested Unverified',
          location: baseLocation,
          ownerUserId: OWNER_ID,
          accepts: ['clothing'],
          country: 'CO',
        }).toSnapshot(),
        verificationLevel: VerificationLevel.Unverified,
        publicStatus: PublicStatus.Active,
        createdAt: new Date(),
      });
      await repo.save(verified);
      await repo.save(unverified);

      const { byCategory, byCountry, total } = await repo.facets(
        EmergencyId.fromString(EM),
      );

      expect(total).toBe(1);
      expect(byCategory['water']).toBe(1);
      expect(byCategory['clothing']).toBeUndefined();
      expect(byCountry['VE']).toBe(1);
      expect(byCountry['CO']).toBeUndefined();
    });
  });

  // ─── Issue #28: findNearbyVisible ──────────────────────────────────────────

  describe('findNearbyVisible', () => {
    // Query point: Caracas, Venezuela
    const GEO_EM = '28280000-0000-4000-8000-000000000028';
    const GEO_LAT = 10.4806;
    const GEO_LNG = -66.9036;

    const makeGeoResource = (
      name: string,
      lat: number,
      lng: number,
      status: PublicStatus,
    ) => {
      const base = Resource.register({
        id: ResourceId.create(),
        emergencyId: EmergencyId.fromString(GEO_EM),
        type: ResourceType.CollectionPoint,
        stage: ResourceStage.Origin,
        name,
        location: Location.create({
          address: `${name} addr`,
          latitude: lat,
          longitude: lng,
        }),
        ownerUserId: OWNER_ID,
      });
      return Resource.fromSnapshot({
        ...base.toSnapshot(),
        verificationLevel: VerificationLevel.Verified,
        publicStatus: status,
        createdAt: new Date(),
      });
    };

    beforeEach(async () => {
      // Clean only the geo emergency to avoid interfering with other tests
      await db
        .delete(resourcesTable)
        .where(eq(resourcesTable.emergencyId, GEO_EM));
    });

    it('returns resources within radius ordered by distance, excludes far and hidden', async () => {
      // R1: at origin ~0m — ACTIVE
      const r1 = makeGeoResource(
        'R1 origin',
        GEO_LAT,
        GEO_LNG,
        PublicStatus.Active,
      );
      // R2: ~1.3km away — ACTIVE
      const r2 = makeGeoResource(
        'R2 nearby',
        10.49,
        -66.903,
        PublicStatus.Active,
      );
      // R3: ~8km away — SATURATED (still visible, within 10km radius)
      const r3 = makeGeoResource(
        'R3 saturated',
        10.553,
        -66.9036,
        PublicStatus.Saturated,
      );
      // R_far: ~35km away — ACTIVE (beyond 10km radius)
      const rFar = makeGeoResource('R_far', 10.8, -66.9, PublicStatus.Active);
      // R_hidden: same coords as R1 — HIDDEN (excluded by status)
      const rHidden = makeGeoResource(
        'R_hidden',
        GEO_LAT,
        GEO_LNG,
        PublicStatus.Hidden,
      );

      await repo.save(r1);
      await repo.save(r2);
      await repo.save(r3);
      await repo.save(rFar);
      await repo.save(rHidden);

      const results = await repo.findNearbyVisible(
        EmergencyId.fromString(GEO_EM),
        { lat: GEO_LAT, lng: GEO_LNG, radiusMeters: 10000, limit: 10 },
      );

      const names = results.map((r) => r.resource.name);
      expect(names).toContain('R1 origin');
      expect(names).toContain('R2 nearby');
      expect(names).toContain('R3 saturated');
      expect(names).not.toContain('R_far');
      expect(names).not.toContain('R_hidden');
      expect(results).toHaveLength(3);

      // Ordered by distance ascending
      expect(results[0].resource.name).toBe('R1 origin');
      expect(results[1].distanceMeters).toBeGreaterThan(
        results[0].distanceMeters,
      );
      expect(results[2].distanceMeters).toBeGreaterThan(
        results[1].distanceMeters,
      );

      // Distance checks
      expect(results[0].distanceMeters).toBeLessThan(10);
      expect(results[1].distanceMeters).toBeGreaterThan(0);
      expect(results[2].distanceMeters).toBeGreaterThan(
        results[1].distanceMeters,
      );
      for (const r of results) {
        expect(r.distanceMeters).toBeLessThanOrEqual(10000);
      }
    });

    it('regression: findNearbyVisible maps externalUpdatedAt string to Date (fixes 500)', async () => {
      // This test reproduces the prod 500: db.execute() returns timestamptz columns
      // as strings; rawRowToSnapshot must coerce them to Date so toISOString() works.
      const externalUpdatedAt = new Date('2026-06-15T12:00:00.000Z');
      const r = Resource.fromSnapshot({
        ...Resource.register({
          id: ResourceId.create(),
          emergencyId: EmergencyId.fromString(GEO_EM),
          type: ResourceType.CollectionPoint,
          stage: ResourceStage.Origin,
          name: 'Provenance Nearby',
          location: Location.create({
            address: 'Near addr',
            latitude: GEO_LAT,
            longitude: GEO_LNG,
          }),
          ownerUserId: OWNER_ID,
          accepts: ['water'],
          provenance: {
            sourceName: 'test-source',
            externalId: 'ext-nearby-1',
            externalUpdatedAt,
            raw: { x: 1 },
          },
        }).toSnapshot(),
        verificationLevel: VerificationLevel.Verified,
        publicStatus: PublicStatus.Active,
        createdAt: new Date(),
      });
      await repo.save(r);

      const results = await repo.findNearbyVisible(
        EmergencyId.fromString(GEO_EM),
        { lat: GEO_LAT, lng: GEO_LNG, radiusMeters: 500, limit: 10 },
      );

      expect(results).toHaveLength(1);
      const found = results[0].resource;

      // provenance.externalUpdatedAt must be a Date, not a string
      expect(found.provenance?.externalUpdatedAt).toBeInstanceOf(Date);
      // And it must serialise cleanly — this is what toResourceView() calls;
      // if the value is still a string this throws: "not a function"
      expect(() =>
        found.provenance?.externalUpdatedAt?.toISOString(),
      ).not.toThrow();
      expect(found.provenance?.externalUpdatedAt?.toISOString()).toBe(
        '2026-06-15T12:00:00.000Z',
      );

      // createdAt must also be a Date
      expect(found.createdAt).toBeInstanceOf(Date);

      // accepts must be a proper array (not a raw PG literal like {water})
      expect(found.accepts).toEqual(['water']);

      // distanceMeters must be a finite number
      expect(results[0].distanceMeters).toBeLessThan(10);
    });

    it('with radiusMeters=2000 returns only resources within 2km', async () => {
      const r1 = makeGeoResource(
        'R1 origin',
        GEO_LAT,
        GEO_LNG,
        PublicStatus.Active,
      );
      const r2 = makeGeoResource(
        'R2 nearby',
        10.49,
        -66.903,
        PublicStatus.Active,
      );
      const r3 = makeGeoResource('R3 far', 10.6, -66.9, PublicStatus.Saturated);

      await repo.save(r1);
      await repo.save(r2);
      await repo.save(r3);

      const results = await repo.findNearbyVisible(
        EmergencyId.fromString(GEO_EM),
        { lat: GEO_LAT, lng: GEO_LNG, radiusMeters: 2000, limit: 10 },
      );

      const names = results.map((r) => r.resource.name);
      expect(names).toContain('R1 origin');
      expect(names).toContain('R2 nearby');
      expect(names).not.toContain('R3 far');
      expect(results).toHaveLength(2);
    });
  });

  // ─── Issue #68: findInBounds ───────────────────────────────────────────────

  describe('findInBounds', () => {
    // Bounding box centered around Caracas, Venezuela
    const BBOX_EM = '68680000-0000-4000-8000-000000000068';
    // Origin: 10.4806, -66.9036
    const MIN_LAT = 10.3;
    const MAX_LAT = 10.7;
    const MIN_LNG = -67.2;
    const MAX_LNG = -66.6;

    const makeBboxResource = (
      name: string,
      lat: number,
      lng: number,
      status: PublicStatus,
    ) => {
      const base = Resource.register({
        id: ResourceId.create(),
        emergencyId: EmergencyId.fromString(BBOX_EM),
        type: ResourceType.CollectionPoint,
        stage: ResourceStage.Origin,
        name,
        location: Location.create({
          address: `${name} addr`,
          latitude: lat,
          longitude: lng,
        }),
        ownerUserId: OWNER_ID,
      });
      return Resource.fromSnapshot({
        ...base.toSnapshot(),
        verificationLevel: VerificationLevel.Verified,
        publicStatus: status,
        createdAt: new Date(),
      });
    };

    beforeEach(async () => {
      await db
        .delete(resourcesTable)
        .where(eq(resourcesTable.emergencyId, BBOX_EM));
    });

    it('returns only resources inside the bounding box with visible status', async () => {
      // Inside + Active
      const r1 = makeBboxResource(
        'R1 inside',
        10.48,
        -66.9,
        PublicStatus.Active,
      );
      // Inside + Saturated
      const r2 = makeBboxResource(
        'R2 saturated',
        10.5,
        -67.1,
        PublicStatus.Saturated,
      );
      // Inside + Paused
      const r3 = makeBboxResource(
        'R3 paused',
        10.55,
        -66.7,
        PublicStatus.Paused,
      );
      // Outside lat (too far north)
      const rOutLat = makeBboxResource(
        'R_out_lat',
        10.8,
        -66.9,
        PublicStatus.Active,
      );
      // Outside lng (too far east)
      const rOutLng = makeBboxResource(
        'R_out_lng',
        10.48,
        -66.5,
        PublicStatus.Active,
      );
      // Hidden (excluded by status)
      const rHidden = makeBboxResource(
        'R_hidden',
        10.48,
        -66.9,
        PublicStatus.Hidden,
      );
      // Closed (excluded by status)
      const rClosed = makeBboxResource(
        'R_closed',
        10.48,
        -66.9,
        PublicStatus.Closed,
      );

      await repo.save(r1);
      await repo.save(r2);
      await repo.save(r3);
      await repo.save(rOutLat);
      await repo.save(rOutLng);
      await repo.save(rHidden);
      await repo.save(rClosed);

      const results = await repo.findInBounds(EmergencyId.fromString(BBOX_EM), {
        minLat: MIN_LAT,
        minLng: MIN_LNG,
        maxLat: MAX_LAT,
        maxLng: MAX_LNG,
        limit: 50,
      });

      const names = results.map((r) => r.name).sort();
      expect(names).toEqual(['R1 inside', 'R2 saturated', 'R3 paused']);
      expect(names).not.toContain('R_out_lat');
      expect(names).not.toContain('R_out_lng');
      expect(names).not.toContain('R_hidden');
      expect(names).not.toContain('R_closed');
    });

    it('respects limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await repo.save(
          makeBboxResource(
            `Resource ${i}`,
            10.48 + i * 0.01,
            -66.9,
            PublicStatus.Active,
          ),
        );
      }

      const results = await repo.findInBounds(EmergencyId.fromString(BBOX_EM), {
        minLat: MIN_LAT,
        minLng: MIN_LNG,
        maxLat: MAX_LAT,
        maxLng: MAX_LNG,
        limit: 3,
      });

      expect(results).toHaveLength(3);
    });

    it('returns empty array when no resources in box', async () => {
      await repo.save(
        makeBboxResource('Far away', 50.0, 10.0, PublicStatus.Active),
      );

      const results = await repo.findInBounds(EmergencyId.fromString(BBOX_EM), {
        minLat: MIN_LAT,
        minLng: MIN_LNG,
        maxLat: MAX_LAT,
        maxLng: MAX_LNG,
        limit: 50,
      });

      expect(results).toHaveLength(0);
    });

    it('does not include resources from other emergencies', async () => {
      const OTHER_EM = '99990000-0000-4000-8000-000000000099';
      const other = Resource.fromSnapshot({
        ...Resource.register({
          id: ResourceId.create(),
          emergencyId: EmergencyId.fromString(OTHER_EM),
          type: ResourceType.CollectionPoint,
          stage: ResourceStage.Origin,
          name: 'Other Emergency',
          location: Location.create({
            address: 'addr',
            latitude: 10.48,
            longitude: -66.9,
          }),
          ownerUserId: OWNER_ID,
        }).toSnapshot(),
        verificationLevel: VerificationLevel.Verified,
        publicStatus: PublicStatus.Active,
        createdAt: new Date(),
      });
      const mine = makeBboxResource('Mine', 10.48, -66.9, PublicStatus.Active);
      await repo.save(other);
      await repo.save(mine);

      const results = await repo.findInBounds(EmergencyId.fromString(BBOX_EM), {
        minLat: MIN_LAT,
        minLng: MIN_LNG,
        maxLat: MAX_LAT,
        maxLng: MAX_LNG,
        limit: 50,
      });

      expect(results.map((r) => r.name)).toEqual(['Mine']);
    });
  });

  it('DB constraint rejects source_name without external_id (Fix wave 1)', async () => {
    const id = ResourceId.create().value;
    let threw = false;
    let errorDetail = '';
    try {
      await db.execute(sql`
        INSERT INTO resources (
          id, emergency_id, type, stage, name,
          address, latitude, longitude,
          owner_user_id, verification_level, public_status, created_at,
          source_name, external_id
        ) VALUES (
          ${id}, ${EM}, 'collection_point', 'origin', 'Constraint Test',
          'Calle Test 1, Sevilla', 37.3886, -5.9823,
          ${OWNER_ID}, 'unverified', 'hidden', NOW(),
          'some-source', NULL
        )
      `);
    } catch (err: unknown) {
      threw = true;
      // Drizzle wraps PG errors; check the cause chain for the constraint name
      const fullText = JSON.stringify(err) + String(err);
      errorDetail = fullText;
    }
    expect(threw).toBe(true);
    expect(errorDetail).toMatch(/resources_source_ext_both_or_neither/);
  });

  // ── Admin reads (#177): all statuses + levels, cross-emergency ──────────────
  describe('admin reads (findAllPaged / findByIdForAdmin)', () => {
    const EM2 = '44444444-4444-4444-8444-444444444444';

    /** Persist a resource in a given emergency, status and verification level. */
    async function seed(props: {
      emergencyId: string;
      name: string;
      type?: ResourceType;
      status: PublicStatus;
      verification: VerificationLevel;
    }): Promise<string> {
      const r = Resource.fromSnapshot({
        id: ResourceId.create().value,
        emergencyId: props.emergencyId,
        type: props.type ?? ResourceType.CollectionPoint,
        stage: ResourceStage.Origin,
        name: props.name,
        description: null,
        location: {
          address: 'Calle Test 1, Sevilla',
          latitude: 37.3886,
          longitude: -5.9823,
        },
        ownerUserId: OWNER_ID,
        ownerOrganizationId: null,
        verificationLevel: props.verification,
        publicStatus: props.status,
        createdAt: new Date(),
        contact: null,
        schedule: null,
        manager: null,
        accepts: [],
        country: null,
        city: null,
        provenance: null,
        isFinalRecipient: false,
        recipientType: null,
        disputed: false,
        disputedAt: null,
        items: [],
      });
      await repo.save(r);
      return r.id.value;
    }

    beforeAll(async () => {
      await db
        .insert(emergenciesTable)
        .values({
          id: EM2,
          name: 'Inundación Test',
          slug: 'inundacion-test-177',
          country: 'ES',
          status: 'active',
          createdAt: new Date(),
        })
        .onConflictDoNothing();
    });

    it('returns resources of ALL statuses and levels across emergencies', async () => {
      await seed({
        emergencyId: EM,
        name: 'Oculto sin verificar',
        status: PublicStatus.Hidden,
        verification: VerificationLevel.Unverified,
      });
      await seed({
        emergencyId: EM,
        name: 'Cerrado oficial',
        status: PublicStatus.Closed,
        verification: VerificationLevel.Official,
      });
      await seed({
        emergencyId: EM2,
        name: 'Activo verificado otra emergencia',
        status: PublicStatus.Active,
        verification: VerificationLevel.Verified,
      });

      const { items, total } = await repo.findAllPaged({ page: 1, limit: 50 });

      expect(total).toBe(3);
      const names = items.map((i) => i.resource.name);
      expect(names).toEqual(
        expect.arrayContaining([
          'Oculto sin verificar',
          'Cerrado oficial',
          'Activo verificado otra emergencia',
        ]),
      );
    });

    it('resolves the emergency name via the join', async () => {
      await seed({
        emergencyId: EM2,
        name: 'Punto en inundación',
        status: PublicStatus.Hidden,
        verification: VerificationLevel.Unverified,
      });

      const { items } = await repo.findAllPaged({
        page: 1,
        limit: 50,
        emergencyId: EmergencyId.fromString(EM2),
      });

      expect(items).toHaveLength(1);
      expect(items[0]?.emergencyName).toBe('Inundación Test');
    });

    it('filters by emergency, status and verification', async () => {
      await seed({
        emergencyId: EM,
        name: 'EM activo verificado',
        status: PublicStatus.Active,
        verification: VerificationLevel.Verified,
      });
      await seed({
        emergencyId: EM,
        name: 'EM cerrado verificado',
        status: PublicStatus.Closed,
        verification: VerificationLevel.Verified,
      });
      await seed({
        emergencyId: EM2,
        name: 'EM2 activo verificado',
        status: PublicStatus.Active,
        verification: VerificationLevel.Verified,
      });

      const { items, total } = await repo.findAllPaged({
        page: 1,
        limit: 50,
        emergencyId: EmergencyId.fromString(EM),
        status: PublicStatus.Active,
        verification: VerificationLevel.Verified,
      });

      expect(total).toBe(1);
      expect(items[0]?.resource.name).toBe('EM activo verificado');
    });

    it('filters by free-text q over name', async () => {
      await seed({
        emergencyId: EM,
        name: 'Cruz Roja Centro',
        status: PublicStatus.Hidden,
        verification: VerificationLevel.Unverified,
      });
      await seed({
        emergencyId: EM,
        name: 'Cáritas Norte',
        status: PublicStatus.Hidden,
        verification: VerificationLevel.Unverified,
      });

      const { items, total } = await repo.findAllPaged({
        page: 1,
        limit: 50,
        q: 'cruz',
      });

      expect(total).toBe(1);
      expect(items[0]?.resource.name).toBe('Cruz Roja Centro');
    });

    it('paginates with a stable order', async () => {
      for (let i = 0; i < 5; i++) {
        await seed({
          emergencyId: EM,
          name: `Punto ${i}`,
          status: PublicStatus.Hidden,
          verification: VerificationLevel.Unverified,
        });
      }

      const page1 = await repo.findAllPaged({ page: 1, limit: 2 });
      const page2 = await repo.findAllPaged({ page: 2, limit: 2 });

      expect(page1.total).toBe(5);
      expect(page1.items).toHaveLength(2);
      expect(page2.items).toHaveLength(2);
      const ids1 = page1.items.map((i) => i.resource.id.value);
      const ids2 = page2.items.map((i) => i.resource.id.value);
      // No overlap between pages.
      expect(ids1.filter((id) => ids2.includes(id))).toHaveLength(0);
    });

    it('findByIdForAdmin returns a hidden resource with its emergency name + inventory', async () => {
      const withItems = Resource.fromSnapshot({
        id: ResourceId.create().value,
        emergencyId: EM2,
        type: ResourceType.Warehouse,
        stage: ResourceStage.Origin,
        name: 'Almacén oculto con stock',
        description: null,
        location: {
          address: 'Calle Test 1, Sevilla',
          latitude: 37.3886,
          longitude: -5.9823,
        },
        ownerUserId: OWNER_ID,
        ownerOrganizationId: null,
        verificationLevel: VerificationLevel.Unverified,
        publicStatus: PublicStatus.Hidden,
        createdAt: new Date(),
        contact: null,
        schedule: null,
        manager: null,
        accepts: [],
        country: null,
        city: null,
        provenance: null,
        isFinalRecipient: false,
        recipientType: null,
        disputed: false,
        disputedAt: null,
        items: [
          SupplyLine.create({
            name: 'Agua',
            quantity: 100,
            unit: 'L',
            category: Category.Water,
          }).toSnapshot(),
        ],
      });
      await repo.save(withItems);

      const found = await repo.findByIdForAdmin(withItems.id);

      expect(found).not.toBeNull();
      expect(found?.resource.publicStatus).toBe(PublicStatus.Hidden);
      expect(found?.emergencyName).toBe('Inundación Test');
      expect(found?.resource.items).toHaveLength(1);
      expect(found?.resource.items[0]?.toSnapshot().category).toBe(
        Category.Water,
      );
    });

    it('findByIdForAdmin returns null for an unknown id', async () => {
      const found = await repo.findByIdForAdmin(ResourceId.create());
      expect(found).toBeNull();
    });
  });
});
