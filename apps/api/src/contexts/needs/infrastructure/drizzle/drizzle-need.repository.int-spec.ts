import { eq } from 'drizzle-orm';
import { createDb, Db } from '../../../../shared/db';
import { needsTable, needItemsTable } from './schema';
import { DrizzleNeedRepository } from './drizzle-need.repository';
import { Need } from '../../domain/need';
import { NeedId } from '../../domain/need-id';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import { Category, Priority, NeedStatus } from '../../domain/need-enums';
import { Location } from '../../../../shared/domain/location';
import { SupplyLine } from '../../../supplies/domain/supply-line';
import type { Pool } from 'pg';

const URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';
const EM = '22222222-2222-4222-8222-222222222222';
const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function makeLocation() {
  return Location.create({
    address: 'Test Street, Caracas',
    latitude: 10.4806,
    longitude: -66.9036,
  });
}

function makeItems() {
  return [
    SupplyLine.create({
      name: 'Water',
      quantity: 50,
      unit: 'liters',
      category: Category.Water,
    }),
  ];
}

function makeNeed(overrides?: { title?: string; items?: SupplyLine[] }) {
  return Need.create({
    id: NeedId.create(),
    emergencyId: EmergencyId.fromString(EM),
    title: overrides?.title ?? 'Test need',
    description: null,
    location: makeLocation(),
    priority: Priority.High,
    requesterUserId: USER_ID,
    requesterOrganizationId: null,
    items: overrides?.items ?? makeItems(),
  });
}

describe('DrizzleNeedRepository (integration)', () => {
  let db: Db;
  let pool: Pool;
  let repo: DrizzleNeedRepository;

  beforeAll(() => {
    ({ db, pool } = createDb(URL));
    repo = new DrizzleNeedRepository(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await db.delete(needItemsTable);
    await db.delete(needsTable);
  });

  it('round-trips a need through Postgres (with items and location)', async () => {
    const need = makeNeed({ title: 'Water bottles' });
    await repo.save(need);
    const found = await repo.findById(need.id);

    expect(found).not.toBeNull();
    expect(found!.title).toBe('Water bottles');
    expect(found!.status).toBe(NeedStatus.Pending);
    expect(found!.requesterUserId).toBe(USER_ID);
    expect(found!.managingOrganizationId).toBeNull();

    // location
    expect(found!.location.address).toBe('Test Street, Caracas');
    expect(found!.location.latitude).toBe(10.4806);
    expect(found!.location.longitude).toBe(-66.9036);

    // items
    expect(found!.items).toHaveLength(1);
    expect(found!.items[0].name).toBe('Water');
    expect(found!.items[0].quantity).toBe(50);
    expect(found!.items[0].unit).toBe('liters');
    expect(found!.items[0].category).toBe(Category.Water);
  });

  it('round-trips the resourceId link to a final recipient (#60)', async () => {
    const resourceId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const need = Need.create({
      id: NeedId.create(),
      emergencyId: EmergencyId.fromString(EM),
      title: 'Linked to recipient',
      description: null,
      location: makeLocation(),
      priority: Priority.High,
      requesterUserId: USER_ID,
      requesterOrganizationId: null,
      items: makeItems(),
      resourceId,
    });
    await repo.save(need);
    const found = await repo.findById(need.id);
    expect(found!.resourceId).toBe(resourceId);
  });

  it('defaults resourceId to null when not provided', async () => {
    const need = makeNeed();
    await repo.save(need);
    const found = await repo.findById(need.id);
    expect(found!.resourceId).toBeNull();
  });

  it('filters needs by resourceId (1-a-N per recipient)', async () => {
    const recipientA = 'aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa';
    const recipientB = 'bbbbbbbb-2222-4bbb-8bbb-bbbbbbbbbbbb';
    const mk = (resourceId: string, title: string) =>
      Need.create({
        id: NeedId.create(),
        emergencyId: EmergencyId.fromString(EM),
        title,
        description: null,
        location: makeLocation(),
        priority: Priority.High,
        requesterUserId: USER_ID,
        requesterOrganizationId: null,
        items: makeItems(),
        resourceId,
      });
    await repo.save(mk(recipientA, 'For A'));
    await repo.save(mk(recipientB, 'For B'));

    const forA = await repo.findPendingByEmergency(EmergencyId.fromString(EM), {
      resourceId: recipientA,
    });
    expect(forA).toHaveLength(1);
    expect(forA[0].title).toBe('For A');
    expect(forA[0].resourceId).toBe(recipientA);
  });

  it('round-trips a need item presentation, ampolla/EV (#61)', async () => {
    const need = Need.create({
      id: NeedId.create(),
      emergencyId: EmergencyId.fromString(EM),
      title: 'Clindamicina EV',
      description: null,
      location: makeLocation(),
      priority: Priority.High,
      requesterUserId: USER_ID,
      requesterOrganizationId: null,
      items: [
        SupplyLine.create({
          name: 'Clindamicina',
          quantity: 20,
          unit: 'amp',
          category: Category.Medicines,
          presentation: 'EV/ampolla',
        }),
      ],
    });
    await repo.save(need);
    const found = await repo.findById(need.id);
    expect(found!.items[0].presentation).toBe('EV/ampolla');
  });

  it('round-trips need with multiple items', async () => {
    const need = Need.create({
      id: NeedId.create(),
      emergencyId: EmergencyId.fromString(EM),
      title: 'Multi-item',
      description: 'Detailed description',
      location: makeLocation(),
      priority: Priority.Urgent,
      requesterUserId: USER_ID,
      requesterOrganizationId: null,
      items: [
        SupplyLine.create({
          name: 'Food',
          quantity: 100,
          unit: 'boxes',
          category: Category.Food,
        }),
        SupplyLine.create({
          name: 'Blankets',
          quantity: 30,
          unit: null,
          category: Category.Shelter,
        }),
      ],
    });
    await repo.save(need);
    const found = await repo.findById(need.id);

    expect(found!.description).toBe('Detailed description');
    expect(found!.items).toHaveLength(2);
  });

  it('save() updates status and managingOrganizationId on conflict', async () => {
    const orgId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const need = makeNeed({ title: 'Shelter kits' });
    await repo.save(need);

    need.validate();
    need.assignManager(orgId);
    await repo.save(need);

    const found = await repo.findById(need.id);
    expect(found!.status).toBe(NeedStatus.Validated);
    expect(found!.managingOrganizationId).toBe(orgId);
  });

  it('save() re-syncs items correctly (items do not duplicate)', async () => {
    const need = makeNeed();
    await repo.save(need);
    // Save again (upsert path)
    need.validate();
    await repo.save(need);

    const found = await repo.findById(need.id);
    expect(found!.items).toHaveLength(1); // no duplicate
  });

  it('findPendingByEmergency returns only pending needs', async () => {
    const pending = makeNeed({ title: 'Pending food' });
    const toValidate = makeNeed({ title: 'Will be validated' });
    toValidate.validate();

    await repo.save(pending);
    await repo.save(toValidate);

    const result = await repo.findPendingByEmergency(
      EmergencyId.fromString(EM),
    );
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Pending food');
    expect(result[0].items).toHaveLength(1);
  });

  it('findValidatedByEmergency returns only validated needs', async () => {
    const pending = makeNeed({ title: 'Still pending' });
    const validated = makeNeed({ title: 'Validated need' });
    validated.validate();

    await repo.save(pending);
    await repo.save(validated);

    const result = await repo.findValidatedByEmergency(
      EmergencyId.fromString(EM),
    );
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Validated need');
    expect(result[0].status).toBe(NeedStatus.Validated);
    expect(result[0].items).toHaveLength(1);
  });

  it('round-trips null description and null requesterOrganizationId', async () => {
    const need = makeNeed();
    await repo.save(need);
    const found = await repo.findById(need.id);
    expect(found!.description).toBeNull();
    expect(found!.requesterOrganizationId).toBeNull();
  });

  it('round-trips requesterOrganizationId when set', async () => {
    const orgId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const need = Need.create({
      id: NeedId.create(),
      emergencyId: EmergencyId.fromString(EM),
      title: 'Org need',
      description: null,
      location: makeLocation(),
      priority: Priority.Medium,
      requesterUserId: USER_ID,
      requesterOrganizationId: orgId,
      items: makeItems(),
    });
    await repo.save(need);
    const found = await repo.findById(need.id);
    expect(found!.requesterOrganizationId).toBe(orgId);
  });

  it('findPendingByEmergency with 2 needs returns each with its own items (no N+1 cross-contamination)', async () => {
    const need1 = Need.create({
      id: NeedId.create(),
      emergencyId: EmergencyId.fromString(EM),
      title: 'Need One',
      description: null,
      location: makeLocation(),
      priority: Priority.High,
      requesterUserId: USER_ID,
      requesterOrganizationId: null,
      items: [
        SupplyLine.create({
          name: 'Water',
          quantity: 50,
          unit: 'liters',
          category: Category.Water,
        }),
        SupplyLine.create({
          name: 'Bread',
          quantity: 20,
          unit: 'loaves',
          category: Category.Food,
        }),
      ],
    });
    const need2 = Need.create({
      id: NeedId.create(),
      emergencyId: EmergencyId.fromString(EM),
      title: 'Need Two',
      description: null,
      location: makeLocation(),
      priority: Priority.Urgent,
      requesterUserId: USER_ID,
      requesterOrganizationId: null,
      items: [
        SupplyLine.create({
          name: 'Tent',
          quantity: 5,
          unit: null,
          category: Category.Shelter,
        }),
      ],
    });

    await repo.save(need1);
    await repo.save(need2);

    const results = await repo.findPendingByEmergency(
      EmergencyId.fromString(EM),
    );
    expect(results).toHaveLength(2);

    const found1 = results.find((n) => n.id.value === need1.id.value);
    const found2 = results.find((n) => n.id.value === need2.id.value);

    expect(found1).toBeDefined();
    expect(found1!.items).toHaveLength(2);
    const found1Names = found1!.items.map((i) => i.name).sort();
    expect(found1Names).toEqual(['Bread', 'Water']);

    expect(found2).toBeDefined();
    expect(found2!.items).toHaveLength(1);
    expect(found2!.items[0].name).toBe('Tent');
  });

  it('countByEmergencyGroupedByStatus returns zero map when no needs', async () => {
    const counts = await repo.countByEmergencyGroupedByStatus(
      EmergencyId.fromString(EM),
    );
    expect(counts[NeedStatus.Pending]).toBe(0);
    expect(counts[NeedStatus.Validated]).toBe(0);
    expect(counts[NeedStatus.Rejected]).toBe(0);
    expect(counts[NeedStatus.Fulfilled]).toBe(0);
  });

  it('countByEmergencyGroupedByStatus counts each status correctly', async () => {
    const pending = makeNeed({ title: 'P' });
    const validated = makeNeed({ title: 'V' });
    const rejected = makeNeed({ title: 'R' });
    const fulfilled = makeNeed({ title: 'F' });

    validated.validate();
    rejected.reject();
    fulfilled.validate();
    fulfilled.close();

    await repo.save(pending);
    await repo.save(validated);
    await repo.save(rejected);
    await repo.save(fulfilled);

    const counts = await repo.countByEmergencyGroupedByStatus(
      EmergencyId.fromString(EM),
    );
    expect(counts[NeedStatus.Pending]).toBe(1);
    expect(counts[NeedStatus.Validated]).toBe(1);
    expect(counts[NeedStatus.Rejected]).toBe(1);
    expect(counts[NeedStatus.Fulfilled]).toBe(1);
  });

  // F04 — Medical categories round-trip
  it('round-trips a need with medicines category', async () => {
    const need = Need.create({
      id: NeedId.create(),
      emergencyId: EmergencyId.fromString(EM),
      title: 'Medicines need',
      description: null,
      location: makeLocation(),
      priority: Priority.Urgent,
      requesterUserId: USER_ID,
      requesterOrganizationId: null,
      items: [
        SupplyLine.create({
          name: 'Paracetamol',
          quantity: 200,
          unit: 'tablets',
          category: Category.Medicines,
        }),
      ],
    });
    await repo.save(need);
    const found = await repo.findById(need.id);
    expect(found!.items[0].category).toBe(Category.Medicines);
    expect(found!.items[0].category).toBe('medicines');
  });

  // F06 — Expiry/freshness round-trip
  it('round-trips expiresAt and lastVerifiedAt after validate()', async () => {
    const need = makeNeed({ title: 'Expiry test' });
    need.validate();
    await repo.save(need);

    const found = await repo.findById(need.id);
    expect(found!.expiresAt).not.toBeNull();
    expect(found!.lastVerifiedAt).not.toBeNull();
    // expiresAt should be ~48h after validation
    const diffMs =
      found!.expiresAt!.getTime() - found!.lastVerifiedAt!.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    expect(diffHours).toBeCloseTo(48, 0);
  });

  it('round-trips null expiresAt (legacy row)', async () => {
    const need = makeNeed({ title: 'Legacy null expiry' });
    await repo.save(need);
    const found = await repo.findById(need.id);
    expect(found!.expiresAt).toBeNull();
    expect(found!.lastVerifiedAt).toBeNull();
  });

  it('findValidatedByEmergency excludes expired needs but not null-expiresAt', async () => {
    // Fresh validated need (not expired)
    const fresh = makeNeed({ title: 'Fresh' });
    fresh.validate();
    await repo.save(fresh);

    // Expired: save as validated but with expiresAt in the past via raw SQL
    const expired = makeNeed({ title: 'Expired' });
    expired.validate();
    await repo.save(expired);

    // Back-date expires_at via raw update
    const pastExpiry = new Date(Date.now() - 1000 * 60 * 60); // 1 hour ago
    await db
      .update(needsTable)
      .set({ expiresAt: pastExpiry })
      .where(eq(needsTable.id, expired.id.value));

    // Legacy: null expiresAt
    const legacy = makeNeed({ title: 'Legacy' });
    legacy.validate();
    const legacySnap = {
      ...legacy.toSnapshot(),
      expiresAt: null,
      lastVerifiedAt: null,
    };
    const legacyNeed = Need.fromSnapshot(legacySnap);
    await repo.save(legacyNeed);

    const result = await repo.findValidatedByEmergency(
      EmergencyId.fromString(EM),
    );
    const ids = result.map((n) => n.id.value);

    expect(ids).toContain(fresh.id.value); // fresh → included
    expect(ids).not.toContain(expired.id.value); // expired → excluded
    expect(ids).toContain(legacyNeed.id.value); // null → included (retrocompat)
  });

  it('findExpiredByEmergency returns only expired needs', async () => {
    const fresh = makeNeed({ title: 'Not expired' });
    fresh.validate();
    await repo.save(fresh);

    const expired = makeNeed({ title: 'Will expire' });
    expired.validate();
    await repo.save(expired);

    const pastExpiry = new Date(Date.now() - 1000 * 60 * 60);
    await db
      .update(needsTable)
      .set({ expiresAt: pastExpiry })
      .where(eq(needsTable.id, expired.id.value));

    const result = await repo.findExpiredByEmergency(
      EmergencyId.fromString(EM),
    );
    const ids = result.map((n) => n.id.value);

    expect(ids).toContain(expired.id.value);
    expect(ids).not.toContain(fresh.id.value);
  });

  it('countByEmergencyGroupedByStatus ignores other emergencies', async () => {
    const OTHER_EM = '33333333-3333-4333-8333-333333333333';
    const myNeed = makeNeed({ title: 'Mine' });
    const otherNeed = Need.create({
      id: NeedId.create(),
      emergencyId: EmergencyId.fromString(OTHER_EM),
      title: 'Other',
      description: null,
      location: makeLocation(),
      priority: Priority.Low,
      requesterUserId: USER_ID,
      requesterOrganizationId: null,
      items: makeItems(),
    });
    await repo.save(myNeed);
    await repo.save(otherNeed);

    const counts = await repo.countByEmergencyGroupedByStatus(
      EmergencyId.fromString(EM),
    );
    expect(counts[NeedStatus.Pending]).toBe(1);
  });

  // #57 — needs near me
  describe('findNearbyValidated', () => {
    const ORIGIN_LAT = 10.4806;
    const ORIGIN_LNG = -66.9036;

    const makeAt = (title: string, lat: number, lng: number) =>
      Need.create({
        id: NeedId.create(),
        emergencyId: EmergencyId.fromString(EM),
        title,
        description: null,
        location: Location.create({
          address: `${title} address`,
          latitude: lat,
          longitude: lng,
        }),
        priority: Priority.High,
        requesterUserId: USER_ID,
        requesterOrganizationId: null,
        items: makeItems(),
      });

    it('returns validated needs within radius ordered by distance', async () => {
      const near = makeAt('Near', ORIGIN_LAT, ORIGIN_LNG); // ~0 m
      near.validate();
      const medium = makeAt('Medium', 10.49, -66.903); // ~1.3 km
      medium.validate();
      const far = makeAt('Far', 10.8, -66.9); // ~35 km
      far.validate();

      await repo.save(near);
      await repo.save(medium);
      await repo.save(far);

      const result = await repo.findNearbyValidated(
        EmergencyId.fromString(EM),
        { lat: ORIGIN_LAT, lng: ORIGIN_LNG, radiusMeters: 10000, limit: 50 },
      );

      expect(result.map((r) => r.need.title)).toEqual(['Near', 'Medium']);
      expect(result[0].distanceMeters).toBeLessThanOrEqual(
        result[1].distanceMeters,
      );
      expect(result[0].distanceMeters).toBeGreaterThanOrEqual(0);
      // items are hydrated for each need
      expect(result[0].need.items).toHaveLength(1);
    });

    it('excludes pending needs', async () => {
      const validated = makeAt('Validated', ORIGIN_LAT, ORIGIN_LNG);
      validated.validate();
      const pending = makeAt('Pending', ORIGIN_LAT, ORIGIN_LNG); // not validated

      await repo.save(validated);
      await repo.save(pending);

      const result = await repo.findNearbyValidated(
        EmergencyId.fromString(EM),
        { lat: ORIGIN_LAT, lng: ORIGIN_LNG, radiusMeters: 5000, limit: 50 },
      );

      expect(result).toHaveLength(1);
      expect(result[0].need.title).toBe('Validated');
    });

    it('excludes expired needs', async () => {
      const fresh = makeAt('Fresh', ORIGIN_LAT, ORIGIN_LNG);
      fresh.validate();
      const expired = makeAt('Expired', ORIGIN_LAT, ORIGIN_LNG);
      expired.validate();

      await repo.save(fresh);
      await repo.save(expired);

      const pastExpiry = new Date(Date.now() - 1000 * 60 * 60); // 1 h ago
      await db
        .update(needsTable)
        .set({ expiresAt: pastExpiry })
        .where(eq(needsTable.id, expired.id.value));

      const result = await repo.findNearbyValidated(
        EmergencyId.fromString(EM),
        { lat: ORIGIN_LAT, lng: ORIGIN_LNG, radiusMeters: 5000, limit: 50 },
      );

      const titles = result.map((r) => r.need.title);
      expect(titles).toContain('Fresh');
      expect(titles).not.toContain('Expired');
    });
  });
});
