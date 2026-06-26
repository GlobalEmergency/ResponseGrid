import { createDb, Db } from '../../../../shared/db';
import { needsTable, needItemsTable } from './schema';
import { DrizzleNeedRepository } from './drizzle-need.repository';
import { Need } from '../../domain/need';
import { NeedId } from '../../domain/need-id';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import { NeedCategory, Priority, NeedStatus } from '../../domain/need-enums';
import { Location } from '../../../../shared/domain/location';
import { NeedItem } from '../../domain/need-item';
import type { Pool } from 'pg';

const URL = process.env.DATABASE_URL ?? 'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';
const EM = '22222222-2222-4222-8222-222222222222';
const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function makeLocation() {
  return Location.create({ address: 'Test Street, Caracas', latitude: 10.4806, longitude: -66.9036 });
}

function makeItems() {
  return [NeedItem.create({ name: 'Water', quantity: 50, unit: 'liters', category: NeedCategory.Water })];
}

function makeNeed(overrides?: { title?: string; items?: NeedItem[] }) {
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
    expect(found!.items[0].category).toBe(NeedCategory.Water);
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
        NeedItem.create({ name: 'Food', quantity: 100, unit: 'boxes', category: NeedCategory.Food }),
        NeedItem.create({ name: 'Blankets', quantity: 30, unit: null, category: NeedCategory.Shelter }),
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

    const result = await repo.findPendingByEmergency(EmergencyId.fromString(EM));
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

    const result = await repo.findValidatedByEmergency(EmergencyId.fromString(EM));
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
        NeedItem.create({ name: 'Water', quantity: 50, unit: 'liters', category: NeedCategory.Water }),
        NeedItem.create({ name: 'Bread', quantity: 20, unit: 'loaves', category: NeedCategory.Food }),
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
        NeedItem.create({ name: 'Tent', quantity: 5, unit: null, category: NeedCategory.Shelter }),
      ],
    });

    await repo.save(need1);
    await repo.save(need2);

    const results = await repo.findPendingByEmergency(EmergencyId.fromString(EM));
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
    const counts = await repo.countByEmergencyGroupedByStatus(EmergencyId.fromString(EM));
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

    const counts = await repo.countByEmergencyGroupedByStatus(EmergencyId.fromString(EM));
    expect(counts[NeedStatus.Pending]).toBe(1);
    expect(counts[NeedStatus.Validated]).toBe(1);
    expect(counts[NeedStatus.Rejected]).toBe(1);
    expect(counts[NeedStatus.Fulfilled]).toBe(1);
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

    const counts = await repo.countByEmergencyGroupedByStatus(EmergencyId.fromString(EM));
    expect(counts[NeedStatus.Pending]).toBe(1);
  });
});
