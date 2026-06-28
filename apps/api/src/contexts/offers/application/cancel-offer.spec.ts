import { CancelOffer, OfferCancelUnauthorizedError } from './cancel-offer';
import { SubmitOffer } from './submit-offer';
import { MatchOffer } from './match-offer';
import { InMemoryOfferRepository } from '../infrastructure/in-memory-offer.repository';
import { FakeOfferEventBus } from '../infrastructure/fake-event-bus';
import { Category, OfferStatus } from '../domain/offer-enums';
import { OfferNotFoundError } from './offer-not-found.error';
import { OfferEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { NeedLookup } from '../domain/ports/need-lookup';

const EM = '11111111-1111-4111-8111-111111111111';
const DONOR_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_USER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const NEED_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

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

async function createOpenOffer(
  repo: InMemoryOfferRepository,
  bus: FakeOfferEventBus,
): Promise<string> {
  const uc = new SubmitOffer(
    repo,
    bus,
    new FakeActiveReader(),
    new FakeNullNeedLookup(),
  );
  const result = await uc.execute({
    emergencyId: EM,
    donorUserId: DONOR_ID,
    donorOrganizationId: null,
    category: Category.Food,
    description: 'Canned goods',
    quantity: 10,
    unit: null,
    location: { address: 'Caracas', latitude: 10.48, longitude: -66.9 },
    targetNeedId: null,
    notes: null,
  });
  bus.published = [];
  return result.id;
}

describe('CancelOffer', () => {
  let repo: InMemoryOfferRepository;
  let bus: FakeOfferEventBus;
  let useCase: CancelOffer;

  beforeEach(() => {
    repo = new InMemoryOfferRepository();
    bus = new FakeOfferEventBus();
    useCase = new CancelOffer(repo, bus);
  });

  it('owner can cancel their own Open offer', async () => {
    const offerId = await createOpenOffer(repo, bus);
    await useCase.execute({
      offerId,
      requesterUserId: DONOR_ID,
      isCoordinator: false,
    });
    const saved = await repo.findById({ value: offerId } as never);
    expect(saved!.status).toBe(OfferStatus.Cancelled);
  });

  it('coordinator can cancel any Open offer', async () => {
    const offerId = await createOpenOffer(repo, bus);
    await useCase.execute({
      offerId,
      requesterUserId: OTHER_USER_ID,
      isCoordinator: true,
    });
    const saved = await repo.findById({ value: offerId } as never);
    expect(saved!.status).toBe(OfferStatus.Cancelled);
  });

  it('coordinator can cancel a Matched offer', async () => {
    const offerId = await createOpenOffer(repo, bus);
    const matchUc = new MatchOffer(repo, bus);
    await matchUc.execute({ offerId, needId: NEED_ID, needEmergencyId: EM });
    bus.published = [];
    await useCase.execute({
      offerId,
      requesterUserId: OTHER_USER_ID,
      isCoordinator: true,
    });
    const saved = await repo.findById({ value: offerId } as never);
    expect(saved!.status).toBe(OfferStatus.Cancelled);
  });

  it('throws OfferCancelUnauthorizedError when non-owner non-coordinator tries to cancel', async () => {
    const offerId = await createOpenOffer(repo, bus);
    await expect(
      useCase.execute({
        offerId,
        requesterUserId: OTHER_USER_ID,
        isCoordinator: false,
      }),
    ).rejects.toThrow(OfferCancelUnauthorizedError);
  });

  it('throws OfferNotFoundError for unknown offerId', async () => {
    await expect(
      useCase.execute({
        offerId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        requesterUserId: DONOR_ID,
        isCoordinator: false,
      }),
    ).rejects.toThrow(OfferNotFoundError);
  });

  it('publishes offer.cancelled event', async () => {
    const offerId = await createOpenOffer(repo, bus);
    await useCase.execute({
      offerId,
      requesterUserId: DONOR_ID,
      isCoordinator: false,
    });
    expect(bus.published.map((e) => e.eventName)).toContain('offer.cancelled');
  });
});
