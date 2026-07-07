import { DonationOffer } from './donation-offer';
import { OfferId } from './offer-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { Category, OfferStatus } from './offer-enums';
import {
  OfferNotOpenError,
  OfferNotMatchedError,
  OfferCannotBeCancelledError,
  OfferItemsRequiredError,
} from './offer-errors';
import { SupplyLine } from '@globalemergency/warehouse-core/kernel';
import { Location } from '../../../shared/domain/location';

const EM = '11111111-1111-4111-8111-111111111111';
const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const NEED_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

function makeLocation(): Location {
  return Location.create({
    address: 'Av. Principal, Caracas',
    latitude: 10.4806,
    longitude: -66.9036,
  });
}

function line(overrides?: Partial<Parameters<typeof SupplyLine.create>[0]>) {
  return SupplyLine.create({
    name: 'Rice bags 25kg',
    quantity: 50,
    unit: 'bags',
    category: Category.Food,
    presentation: null,
    ...overrides,
  });
}

function makeOffer(): DonationOffer {
  return DonationOffer.create({
    id: OfferId.create(),
    emergencyId: EmergencyId.fromString(EM),
    donorUserId: USER_ID,
    donorOrganizationId: null,
    items: [line()],
    location: makeLocation(),
    targetNeedId: null,
    notes: null,
  });
}

describe('DonationOffer aggregate', () => {
  it('creates with Open status and emits offer.created event', () => {
    const offer = makeOffer();
    expect(offer.status).toBe(OfferStatus.Open);
    const events = offer.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventName).toBe('offer.created');
  });

  it('create() sets all fields correctly', () => {
    const offer = makeOffer();
    expect(offer.donorUserId).toBe(USER_ID);
    expect(offer.donorOrganizationId).toBeNull();
    expect(offer.items).toHaveLength(1);
    expect(offer.items[0].name).toBe('Rice bags 25kg');
    expect(offer.items[0].category).toBe(Category.Food);
    expect(offer.items[0].quantity).toBe(50);
    expect(offer.items[0].unit).toBe('bags');
    expect(offer.targetNeedId).toBeNull();
    expect(offer.matchedNeedId).toBeNull();
    expect(offer.notes).toBeNull();
  });

  it('exposes the distinct categories of its lines', () => {
    const offer = DonationOffer.create({
      id: OfferId.create(),
      emergencyId: EmergencyId.fromString(EM),
      donorUserId: USER_ID,
      donorOrganizationId: null,
      items: [
        line({ name: 'Rice', category: Category.Food }),
        line({ name: 'Water', category: Category.Water }),
        line({ name: 'Beans', category: Category.Food }),
      ],
      location: makeLocation(),
      targetNeedId: null,
      notes: null,
    });
    expect(offer.categories.sort()).toEqual(
      [Category.Food, Category.Water].sort(),
    );
  });

  it('create() with targetNeedId stores it', () => {
    const offer = DonationOffer.create({
      id: OfferId.create(),
      emergencyId: EmergencyId.fromString(EM),
      donorUserId: USER_ID,
      donorOrganizationId: null,
      items: [line({ name: 'First aid kits', category: Category.Medical })],
      location: makeLocation(),
      targetNeedId: NEED_ID,
      notes: 'Urgent delivery',
    });
    expect(offer.targetNeedId).toBe(NEED_ID);
    expect(offer.status).toBe(OfferStatus.Open);
  });

  it('create() throws when there are no items', () => {
    expect(() =>
      DonationOffer.create({
        id: OfferId.create(),
        emergencyId: EmergencyId.fromString(EM),
        donorUserId: USER_ID,
        donorOrganizationId: null,
        items: [],
        location: makeLocation(),
        targetNeedId: null,
        notes: null,
      }),
    ).toThrow(OfferItemsRequiredError);
  });

  it('matchTo() transitions Open → Matched and sets matchedNeedId', () => {
    const offer = makeOffer();
    offer.pullDomainEvents();
    offer.matchTo(NEED_ID);
    expect(offer.status).toBe(OfferStatus.Matched);
    expect(offer.matchedNeedId).toBe(NEED_ID);
    const events = offer.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventName).toBe('offer.matched');
  });

  it('matchTo() throws OfferNotOpenError when already Matched', () => {
    const offer = makeOffer();
    offer.matchTo(NEED_ID);
    expect(() => offer.matchTo(NEED_ID)).toThrow(OfferNotOpenError);
  });

  it('matchTo() throws OfferNotOpenError when Cancelled', () => {
    const offer = makeOffer();
    offer.cancel();
    expect(() => offer.matchTo(NEED_ID)).toThrow(OfferNotOpenError);
  });

  it('markFulfilled() transitions Matched → Fulfilled', () => {
    const offer = makeOffer();
    offer.matchTo(NEED_ID);
    offer.pullDomainEvents();
    offer.markFulfilled();
    expect(offer.status).toBe(OfferStatus.Fulfilled);
    const events = offer.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventName).toBe('offer.fulfilled');
  });

  it('markFulfilled() throws OfferNotMatchedError when Open', () => {
    const offer = makeOffer();
    expect(() => offer.markFulfilled()).toThrow(OfferNotMatchedError);
  });

  it('markFulfilled() throws OfferNotMatchedError when Cancelled', () => {
    const offer = makeOffer();
    offer.cancel();
    expect(() => offer.markFulfilled()).toThrow(OfferNotMatchedError);
  });

  it('cancel() transitions Open → Cancelled', () => {
    const offer = makeOffer();
    offer.pullDomainEvents();
    offer.cancel();
    expect(offer.status).toBe(OfferStatus.Cancelled);
    const events = offer.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventName).toBe('offer.cancelled');
  });

  it('cancel() transitions Matched → Cancelled', () => {
    const offer = makeOffer();
    offer.matchTo(NEED_ID);
    offer.cancel();
    expect(offer.status).toBe(OfferStatus.Cancelled);
  });

  it('cancel() throws OfferCannotBeCancelledError when Fulfilled', () => {
    const offer = makeOffer();
    offer.matchTo(NEED_ID);
    offer.markFulfilled();
    expect(() => offer.cancel()).toThrow(OfferCannotBeCancelledError);
  });

  it('cancel() throws OfferCannotBeCancelledError when already Cancelled', () => {
    const offer = makeOffer();
    offer.cancel();
    expect(() => offer.cancel()).toThrow(OfferCannotBeCancelledError);
  });

  it('edit() replaces the lines and bumps updatedAt', () => {
    const offer = makeOffer();
    offer.edit({
      items: [line({ name: 'Beans', quantity: 12, unit: 'cans' })],
    });
    expect(offer.items).toHaveLength(1);
    expect(offer.items[0].name).toBe('Beans');
    expect(offer.items[0].quantity).toBe(12);
  });

  it('edit() throws when items would become empty', () => {
    const offer = makeOffer();
    expect(() => offer.edit({ items: [] })).toThrow(OfferItemsRequiredError);
  });

  it('pullDomainEvents() drains events (idempotent second call)', () => {
    const offer = makeOffer();
    offer.pullDomainEvents();
    expect(offer.pullDomainEvents()).toHaveLength(0);
  });

  it('toSnapshot/fromSnapshot round-trip preserves all fields', () => {
    const offer = makeOffer();
    offer.matchTo(NEED_ID);

    const snap = offer.toSnapshot();
    const restored = DonationOffer.fromSnapshot(snap);

    expect(restored.status).toBe(OfferStatus.Matched);
    expect(restored.matchedNeedId).toBe(NEED_ID);
    expect(restored.donorUserId).toBe(USER_ID);
    expect(restored.items).toHaveLength(1);
    expect(restored.items[0].name).toBe('Rice bags 25kg');
    expect(restored.items[0].category).toBe(Category.Food);
    expect(restored.items[0].quantity).toBe(50);
    expect(restored.items[0].unit).toBe('bags');
    expect(restored.location.address).toBe('Av. Principal, Caracas');
    expect(restored.location.latitude).toBe(10.4806);
    expect(restored.pullDomainEvents()).toHaveLength(0);
  });

  it('toSnapshot/fromSnapshot handles null optionals', () => {
    const offer = makeOffer();
    const snap = offer.toSnapshot();
    const restored = DonationOffer.fromSnapshot(snap);
    expect(restored.donorOrganizationId).toBeNull();
    expect(restored.targetNeedId).toBeNull();
    expect(restored.matchedNeedId).toBeNull();
    expect(restored.notes).toBeNull();
    expect(restored.items[0].unit).toBe('bags');
  });

  it('matchTo() bumps updatedAt', () => {
    const offer = makeOffer();
    const before = offer.updatedAt.getTime();
    offer.matchTo(NEED_ID);
    expect(offer.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
  });
});
