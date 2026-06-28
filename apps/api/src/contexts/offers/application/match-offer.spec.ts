import { MatchOffer, OfferNeedEmergencyMismatchError } from './match-offer';
import { SubmitOffer } from './submit-offer';
import { InMemoryOfferRepository } from '../infrastructure/in-memory-offer.repository';
import { FakeOfferEventBus } from '../infrastructure/fake-event-bus';
import { Category, OfferStatus } from '../domain/offer-enums';
import { OfferNotFoundError } from './offer-not-found.error';
import { OfferEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { NeedLookup } from '../domain/ports/need-lookup';
import {
  NotificationsPort,
  CreateNotificationParams,
} from '../../notifications/domain/ports/notifications.port';

const EM = '11111111-1111-4111-8111-111111111111';
const OTHER_EM = '22222222-2222-4222-8222-222222222222';
const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
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

class FakeNotificationsPort implements NotificationsPort {
  calls: CreateNotificationParams[] = [];
  create(params: CreateNotificationParams): Promise<void> {
    this.calls.push(params);
    return Promise.resolve();
  }
}

async function createOpenOffer(
  repo: InMemoryOfferRepository,
  bus: FakeOfferEventBus,
): Promise<string> {
  const submitUc = new SubmitOffer(
    repo,
    bus,
    new FakeActiveReader(),
    new FakeNullNeedLookup(),
  );
  const result = await submitUc.execute({
    emergencyId: EM,
    donorUserId: USER_ID,
    donorOrganizationId: null,
    category: Category.Food,
    description: 'Rice bags',
    quantity: 20,
    unit: null,
    location: { address: 'Caracas', latitude: 10.48, longitude: -66.9 },
    targetNeedId: null,
    notes: null,
  });
  bus.published = [];
  return result.id;
}

describe('MatchOffer', () => {
  let repo: InMemoryOfferRepository;
  let bus: FakeOfferEventBus;
  let useCase: MatchOffer;

  beforeEach(() => {
    repo = new InMemoryOfferRepository();
    bus = new FakeOfferEventBus();
    useCase = new MatchOffer(repo, bus);
  });

  it('transitions offer Open → Matched and sets matchedNeedId', async () => {
    const offerId = await createOpenOffer(repo, bus);
    await useCase.execute({ offerId, needId: NEED_ID, needEmergencyId: EM });
    const saved = await repo.findById({ value: offerId } as never);
    expect(saved!.status).toBe(OfferStatus.Matched);
    expect(saved!.matchedNeedId).toBe(NEED_ID);
  });

  it('publishes offer.matched event', async () => {
    const offerId = await createOpenOffer(repo, bus);
    await useCase.execute({ offerId, needId: NEED_ID, needEmergencyId: EM });
    expect(bus.published.map((e) => e.eventName)).toContain('offer.matched');
  });

  it('throws OfferNotFoundError for unknown offerId', async () => {
    await expect(
      useCase.execute({
        offerId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        needId: NEED_ID,
        needEmergencyId: EM,
      }),
    ).rejects.toThrow(OfferNotFoundError);
  });

  it('throws OfferNeedEmergencyMismatchError when need is in different emergency', async () => {
    const offerId = await createOpenOffer(repo, bus);
    await expect(
      useCase.execute({ offerId, needId: NEED_ID, needEmergencyId: OTHER_EM }),
    ).rejects.toThrow(OfferNeedEmergencyMismatchError);
  });

  it('calls NotificationsPort with donorUserId after matching', async () => {
    const notifications = new FakeNotificationsPort();
    const ucWithNotif = new MatchOffer(repo, bus, notifications);
    const offerId = await createOpenOffer(repo, bus);
    await ucWithNotif.execute({
      offerId,
      needId: NEED_ID,
      needEmergencyId: EM,
    });
    expect(notifications.calls).toHaveLength(1);
    expect(notifications.calls[0].userId).toBe(USER_ID);
    expect(notifications.calls[0].emergencyId).toBe(EM);
  });
});
