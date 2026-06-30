import { createDb, Db } from '../../../../shared/db';
import { offersTable } from './schema';
import { suppliesTable } from '../../../supplies/infrastructure/drizzle/schema';
import { DrizzleOfferRepository } from './drizzle-offer.repository';
import { DonationOffer } from '../../domain/donation-offer';
import { OfferId } from '../../domain/offer-id';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import { Category, OfferStatus } from '../../domain/offer-enums';
import { SupplyLine } from '../../../supplies/domain/supply-line';
import { Location } from '../../../../shared/domain/location';
import type { Pool } from 'pg';

const URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';
const EM = '44444444-4444-4444-8444-444444444444';
const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const NEED_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

function makeLocation() {
  return Location.create({
    address: 'Test St, Caracas',
    latitude: 10.4806,
    longitude: -66.9036,
  });
}

function makeOffer(overrides?: { category?: Category; name?: string }) {
  return DonationOffer.create({
    id: OfferId.create(),
    emergencyId: EmergencyId.fromString(EM),
    donorUserId: USER_ID,
    donorOrganizationId: null,
    items: [
      SupplyLine.create({
        name: overrides?.name ?? 'Rice bags',
        quantity: 25,
        unit: 'bags',
        category: overrides?.category ?? Category.Food,
        presentation: null,
        supplyId: '1e4b5f3b-5c9c-4f77-8f50-3d2dbdc0c7d8',
      }),
    ],
    location: makeLocation(),
    targetNeedId: null,
    notes: null,
  });
}

describe('DrizzleOfferRepository (integration)', () => {
  let db: Db;
  let pool: Pool;
  let repo: DrizzleOfferRepository;

  beforeAll(() => {
    ({ db, pool } = createDb(URL));
    repo = new DrizzleOfferRepository(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // FK cascade removes offer_items with their offers.
    await db.delete(offersTable);
    await db
      .insert(suppliesTable)
      .values([
        {
          id: '1e4b5f3b-5c9c-4f77-8f50-3d2dbdc0c7d8',
          code: 'TEST-0001',
          name: 'Agua Test',
          categorySlug: 'water',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      .onConflictDoNothing();
  });

  it('round-trips an offer (with its lines) through Postgres', async () => {
    const offer = makeOffer();
    await repo.save(offer);
    const found = await repo.findById(offer.id);

    expect(found).not.toBeNull();
    expect(found!.id.value).toBe(offer.id.value);
    expect(found!.status).toBe(OfferStatus.Open);
    expect(found!.donorUserId).toBe(USER_ID);
    expect(found!.items).toHaveLength(1);
    expect(found!.items[0].category).toBe(Category.Food);
    expect(found!.items[0].name).toBe('Rice bags');
    expect(found!.items[0].quantity).toBe(25);
    expect(found!.items[0].unit).toBe('bags');
    expect(found!.items[0].supplyId).toBe(
      '1e4b5f3b-5c9c-4f77-8f50-3d2dbdc0c7d8',
    );
    expect(found!.location.address).toBe('Test St, Caracas');
    expect(found!.location.latitude).toBe(10.4806);
    expect(found!.targetNeedId).toBeNull();
    expect(found!.matchedNeedId).toBeNull();
    expect(found!.notes).toBeNull();
  });

  it('round-trips a multi-line offer', async () => {
    const offer = DonationOffer.create({
      id: OfferId.create(),
      emergencyId: EmergencyId.fromString(EM),
      donorUserId: USER_ID,
      donorOrganizationId: null,
      items: [
        SupplyLine.create({
          name: 'Rice',
          quantity: 10,
          unit: 'kg',
          category: Category.Food,
          presentation: null,
        }),
        SupplyLine.create({
          name: 'Water',
          quantity: 30,
          unit: 'liters',
          category: Category.Water,
          presentation: null,
        }),
      ],
      location: makeLocation(),
      targetNeedId: null,
      notes: null,
    });
    await repo.save(offer);

    const found = await repo.findById(offer.id);
    expect(found!.items).toHaveLength(2);
    const names = found!.items.map((i) => i.name).sort();
    expect(names).toEqual(['Rice', 'Water']);
  });

  it('round-trips null optionals correctly', async () => {
    const offer = DonationOffer.create({
      id: OfferId.create(),
      emergencyId: EmergencyId.fromString(EM),
      donorUserId: USER_ID,
      donorOrganizationId: null,
      items: [
        SupplyLine.create({
          name: 'Water',
          quantity: 10,
          unit: null,
          category: Category.Water,
          presentation: null,
        }),
      ],
      location: makeLocation(),
      targetNeedId: null,
      notes: null,
    });
    await repo.save(offer);
    const found = await repo.findById(offer.id);
    expect(found!.items[0].unit).toBeNull();
    expect(found!.donorOrganizationId).toBeNull();
    expect(found!.targetNeedId).toBeNull();
    expect(found!.notes).toBeNull();
  });

  it('save() updates status and matchedNeedId on upsert (and keeps lines)', async () => {
    const offer = makeOffer();
    await repo.save(offer);

    offer.matchTo(NEED_ID);
    await repo.save(offer);

    const found = await repo.findById(offer.id);
    expect(found!.status).toBe(OfferStatus.Matched);
    expect(found!.matchedNeedId).toBe(NEED_ID);
    expect(found!.items).toHaveLength(1);
  });

  it('findByEmergencyAndStatus returns only Open offers', async () => {
    const open = makeOffer({ name: 'Open offer' });
    const matched = makeOffer({ name: 'Matched offer' });
    matched.matchTo(NEED_ID);

    await repo.save(open);
    await repo.save(matched);

    const result = await repo.findByEmergencyAndStatus(
      EmergencyId.fromString(EM),
      OfferStatus.Open,
    );
    expect(result).toHaveLength(1);
    expect(result[0].items[0].name).toBe('Open offer');
  });

  it('findByMatchedNeedId returns offers matched to the need', async () => {
    const matched = makeOffer({ name: 'Will be matched' });
    matched.matchTo(NEED_ID);
    const unmatched = makeOffer({ name: 'Still open' });

    await repo.save(matched);
    await repo.save(unmatched);

    const result = await repo.findByMatchedNeedId(NEED_ID);
    expect(result).toHaveLength(1);
    expect(result[0].items[0].name).toBe('Will be matched');
  });

  it('findByDonorAndEmergency returns only offers from that donor', async () => {
    const OTHER_USER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const mine = makeOffer({ name: 'My offer' });
    const theirs = DonationOffer.create({
      id: OfferId.create(),
      emergencyId: EmergencyId.fromString(EM),
      donorUserId: OTHER_USER,
      donorOrganizationId: null,
      items: [
        SupplyLine.create({
          name: 'Their offer',
          quantity: 5,
          unit: null,
          category: Category.Food,
          presentation: null,
        }),
      ],
      location: makeLocation(),
      targetNeedId: null,
      notes: null,
    });

    await repo.save(mine);
    await repo.save(theirs);

    const result = await repo.findByDonorAndEmergency(
      USER_ID,
      EmergencyId.fromString(EM),
    );
    expect(result).toHaveLength(1);
    expect(result[0].items[0].name).toBe('My offer');
  });

  it('findOpenByEmergencyAndCategory matches offers with a line in that category', async () => {
    const foodOffer = makeOffer({ category: Category.Food });
    const medOffer = makeOffer({
      category: Category.Medical,
      name: 'Med',
    });

    await repo.save(foodOffer);
    await repo.save(medOffer);

    const result = await repo.findOpenByEmergencyAndCategory(
      EmergencyId.fromString(EM),
      Category.Food,
    );
    expect(result).toHaveLength(1);
    expect(result[0].items[0].category).toBe(Category.Food);
  });
});
