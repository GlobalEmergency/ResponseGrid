import { DiscardOffer } from './discard-offer';
import { SubmitOffer } from './submit-offer';
import { InMemoryOfferRepository } from '../infrastructure/in-memory-offer.repository';
import { FakeOfferEventBus } from '../infrastructure/fake-event-bus';
import { Category, OfferStatus } from '../domain/offer-enums';
import { OfferNotFoundError } from './offer-not-found.error';
import { OfferCannotBeCancelledError } from '../domain/offer-errors';
import { OfferEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { NeedLookup } from '../domain/ports/need-lookup';
import { OfferId } from '../domain/offer-id';

const EM = '11111111-1111-4111-8111-111111111111';
const DONOR_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const UNKNOWN_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

class FakeActiveReader implements OfferEmergencyStatusReader {
  getStatus(_id: string): Promise<string | null> {
    return Promise.resolve('active');
  }
}
class FakeNullNeedLookup implements NeedLookup {
  findEmergencyId(_id: string): Promise<string | null> {
    return Promise.resolve(null);
  }
  findCategory(_id: string): Promise<string | null> {
    return Promise.resolve(null);
  }
  findLocation(_id: string): Promise<{
    latitude: number;
    longitude: number;
    emergencyId: string;
  } | null> {
    return Promise.resolve(null);
  }
}

describe('DiscardOffer', () => {
  let repo: InMemoryOfferRepository;
  let bus: FakeOfferEventBus;
  let discardOffer: DiscardOffer;
  let submitOffer: SubmitOffer;

  beforeEach(() => {
    repo = new InMemoryOfferRepository();
    bus = new FakeOfferEventBus();
    discardOffer = new DiscardOffer(repo, bus);
    submitOffer = new SubmitOffer(
      repo,
      bus,
      new FakeActiveReader(),
      new FakeNullNeedLookup(),
    );
  });

  async function seed(): Promise<string> {
    const { id } = await submitOffer.execute({
      emergencyId: EM,
      donorUserId: DONOR_ID,
      donorOrganizationId: null,
      category: Category.Food,
      description: 'Arroz 25kg',
      quantity: 10,
      unit: 'sacos',
      location: { address: 'Caracas', latitude: 10.48, longitude: -66.9 },
      targetNeedId: null,
      notes: null,
    });
    bus.published = [];
    return id;
  }

  it('transitions the offer to cancelled and reports the status change', async () => {
    const id = await seed();

    const result = await discardOffer.execute({ offerId: id });

    const offer = await repo.findById(OfferId.fromString(id));
    expect(offer!.status).toBe(OfferStatus.Cancelled);

    expect(result.emergencyId).toBe(EM);
    expect(result.targetStatus).toBe(OfferStatus.Cancelled);
    expect(result.changes).toEqual([
      {
        field: 'status',
        before: OfferStatus.Open,
        after: OfferStatus.Cancelled,
      },
    ]);
    expect(bus.published.map((e) => e.eventName)).toEqual(['offer.cancelled']);
  });

  it('throws OfferNotFoundError for an unknown id', async () => {
    await expect(discardOffer.execute({ offerId: UNKNOWN_ID })).rejects.toThrow(
      OfferNotFoundError,
    );
  });

  it('cannot discard an already-cancelled offer', async () => {
    const id = await seed();
    await discardOffer.execute({ offerId: id });

    await expect(discardOffer.execute({ offerId: id })).rejects.toThrow(
      OfferCannotBeCancelledError,
    );
  });
});
