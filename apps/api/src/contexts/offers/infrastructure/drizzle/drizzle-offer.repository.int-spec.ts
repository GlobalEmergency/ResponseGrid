import { createDb, Db } from '../../../../shared/db';
import { offersTable } from './schema';
import { DrizzleOfferRepository } from './drizzle-offer.repository';
import { DonationOffer } from '../../domain/donation-offer';
import { OfferId } from '../../domain/offer-id';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import { Category, OfferStatus } from '../../domain/offer-enums';
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

function makeOffer(overrides?: { category?: Category; description?: string }) {
  return DonationOffer.create({
    id: OfferId.create(),
    emergencyId: EmergencyId.fromString(EM),
    donorUserId: USER_ID,
    donorOrganizationId: null,
    category: overrides?.category ?? Category.Food,
    description: overrides?.description ?? 'Rice bags',
    quantity: 25,
    unit: 'bags',
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
    await db.delete(offersTable);
  });

  it('round-trips an offer through Postgres', async () => {
    const offer = makeOffer();
    await repo.save(offer);
    const found = await repo.findById(offer.id);

    expect(found).not.toBeNull();
    expect(found!.id.value).toBe(offer.id.value);
    expect(found!.status).toBe(OfferStatus.Open);
    expect(found!.donorUserId).toBe(USER_ID);
    expect(found!.category).toBe(Category.Food);
    expect(found!.description).toBe('Rice bags');
    expect(found!.quantity).toBe(25);
    expect(found!.unit).toBe('bags');
    expect(found!.location.address).toBe('Test St, Caracas');
    expect(found!.location.latitude).toBe(10.4806);
    expect(found!.targetNeedId).toBeNull();
    expect(found!.matchedNeedId).toBeNull();
    expect(found!.notes).toBeNull();
  });

  it('round-trips null optionals correctly', async () => {
    const offer = DonationOffer.create({
      id: OfferId.create(),
      emergencyId: EmergencyId.fromString(EM),
      donorUserId: USER_ID,
      donorOrganizationId: null,
      category: Category.Water,
      description: 'Water',
      quantity: 10,
      unit: null,
      location: makeLocation(),
      targetNeedId: null,
      notes: null,
    });
    await repo.save(offer);
    const found = await repo.findById(offer.id);
    expect(found!.unit).toBeNull();
    expect(found!.donorOrganizationId).toBeNull();
    expect(found!.targetNeedId).toBeNull();
    expect(found!.notes).toBeNull();
  });

  it('save() updates status and matchedNeedId on upsert', async () => {
    const offer = makeOffer();
    await repo.save(offer);

    offer.matchTo(NEED_ID);
    await repo.save(offer);

    const found = await repo.findById(offer.id);
    expect(found!.status).toBe(OfferStatus.Matched);
    expect(found!.matchedNeedId).toBe(NEED_ID);
  });

  it('findByEmergencyAndStatus returns only Open offers', async () => {
    const open = makeOffer({ description: 'Open offer' });
    const matched = makeOffer({ description: 'Matched offer' });
    matched.matchTo(NEED_ID);

    await repo.save(open);
    await repo.save(matched);

    const result = await repo.findByEmergencyAndStatus(
      EmergencyId.fromString(EM),
      OfferStatus.Open,
    );
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe('Open offer');
  });

  it('findByMatchedNeedId returns offers matched to the need', async () => {
    const matched = makeOffer({ description: 'Will be matched' });
    matched.matchTo(NEED_ID);
    const unmatched = makeOffer({ description: 'Still open' });

    await repo.save(matched);
    await repo.save(unmatched);

    const result = await repo.findByMatchedNeedId(NEED_ID);
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe('Will be matched');
  });

  it('findByDonorAndEmergency returns only offers from that donor', async () => {
    const OTHER_USER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const mine = makeOffer({ description: 'My offer' });
    const theirs = DonationOffer.create({
      id: OfferId.create(),
      emergencyId: EmergencyId.fromString(EM),
      donorUserId: OTHER_USER,
      donorOrganizationId: null,
      category: Category.Food,
      description: 'Their offer',
      quantity: 5,
      unit: null,
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
    expect(result[0].description).toBe('My offer');
  });

  it('findOpenByEmergencyAndCategory filters by category', async () => {
    const foodOffer = makeOffer({ category: Category.Food });
    const medOffer = makeOffer({
      category: Category.Medical,
      description: 'Med',
    });

    await repo.save(foodOffer);
    await repo.save(medOffer);

    const result = await repo.findOpenByEmergencyAndCategory(
      EmergencyId.fromString(EM),
      Category.Food,
    );
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe(Category.Food);
  });
});
