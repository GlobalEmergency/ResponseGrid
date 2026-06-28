import { DonationOffer } from './donation-offer';
import { OfferId } from './offer-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { Category, OfferStatus } from './offer-enums';
import {
  OfferNotOpenError,
  OfferNotMatchedError,
  OfferCannotBeCancelledError,
} from './offer-errors';
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

function makeOffer(): DonationOffer {
  return DonationOffer.create({
    id: OfferId.create(),
    emergencyId: EmergencyId.fromString(EM),
    donorUserId: USER_ID,
    donorOrganizationId: null,
    category: Category.Food,
    description: 'Rice bags 25kg',
    quantity: 50,
    unit: 'bags',
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
    expect(offer.category).toBe(Category.Food);
    expect(offer.description).toBe('Rice bags 25kg');
    expect(offer.quantity).toBe(50);
    expect(offer.unit).toBe('bags');
    expect(offer.targetNeedId).toBeNull();
    expect(offer.matchedNeedId).toBeNull();
    expect(offer.notes).toBeNull();
  });

  it('create() with targetNeedId stores it', () => {
    const offer = DonationOffer.create({
      id: OfferId.create(),
      emergencyId: EmergencyId.fromString(EM),
      donorUserId: USER_ID,
      donorOrganizationId: null,
      category: Category.Medical,
      description: 'First aid kits',
      quantity: 10,
      unit: null,
      location: makeLocation(),
      targetNeedId: NEED_ID,
      notes: 'Urgent delivery',
    });
    expect(offer.targetNeedId).toBe(NEED_ID);
    expect(offer.status).toBe(OfferStatus.Open);
  });

  it('create() throws when quantity is 0', () => {
    expect(() =>
      DonationOffer.create({
        id: OfferId.create(),
        emergencyId: EmergencyId.fromString(EM),
        donorUserId: USER_ID,
        donorOrganizationId: null,
        category: Category.Water,
        description: 'Water bottles',
        quantity: 0,
        unit: 'liters',
        location: makeLocation(),
        targetNeedId: null,
        notes: null,
      }),
    ).toThrow('Offer quantity must be greater than 0');
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
    expect(restored.category).toBe(Category.Food);
    expect(restored.description).toBe('Rice bags 25kg');
    expect(restored.quantity).toBe(50);
    expect(restored.unit).toBe('bags');
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
    expect(restored.unit).toBe('bags');
  });

  it('matchTo() bumps updatedAt', () => {
    const offer = makeOffer();
    const before = offer.updatedAt.getTime();
    offer.matchTo(NEED_ID);
    expect(offer.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
  });
});
