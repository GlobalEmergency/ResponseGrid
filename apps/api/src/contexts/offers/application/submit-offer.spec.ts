import {
  SubmitOffer,
  SubmitOfferCommand,
  TargetNeedNotFoundError,
  TargetNeedWrongEmergencyError,
} from './submit-offer';
import { InMemoryOfferRepository } from '../infrastructure/in-memory-offer.repository';
import { FakeOfferEventBus } from '../infrastructure/fake-event-bus';
import { Category, OfferStatus } from '../domain/offer-enums';
import { OfferEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { NeedLookup } from '../domain/ports/need-lookup';
import { EmergencyNotAcceptingIntakeError } from '../../emergencies/domain/emergency-not-accepting-intake.error';

const EM = '11111111-1111-4111-8111-111111111111';
const OTHER_EM = '22222222-2222-4222-8222-222222222222';
const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const NEED_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

class FakeStatusReader implements OfferEmergencyStatusReader {
  constructor(private readonly status: string | null) {}
  getStatus(_id: string): Promise<string | null> {
    return Promise.resolve(this.status);
  }
}

class FakeNeedLookup implements NeedLookup {
  constructor(
    private readonly emergencyId: string | null,
    private readonly category: string | null = 'food',
  ) {}
  findEmergencyId(_needId: string): Promise<string | null> {
    return Promise.resolve(this.emergencyId);
  }
  findCategory(_needId: string): Promise<string | null> {
    return Promise.resolve(this.category);
  }
  findLocation(_needId: string): Promise<{
    latitude: number;
    longitude: number;
    emergencyId: string;
  } | null> {
    if (this.emergencyId === null) return Promise.resolve(null);
    return Promise.resolve({
      latitude: 10.48,
      longitude: -66.9,
      emergencyId: this.emergencyId,
    });
  }
}

const activeReader = new FakeStatusReader('active');
const nullNeedLookup = new FakeNeedLookup(null);

function makeCmd(overrides?: Partial<SubmitOfferCommand>): SubmitOfferCommand {
  return {
    emergencyId: EM,
    donorUserId: USER_ID,
    donorOrganizationId: null,
    category: Category.Food,
    description: 'Rice bags 25kg',
    quantity: 50,
    unit: 'bags',
    location: {
      address: 'Av. Principal, Caracas',
      latitude: 10.48,
      longitude: -66.9,
    },
    targetNeedId: null,
    notes: null,
    ...overrides,
  };
}

describe('SubmitOffer', () => {
  let repo: InMemoryOfferRepository;
  let bus: FakeOfferEventBus;
  let useCase: SubmitOffer;

  beforeEach(() => {
    repo = new InMemoryOfferRepository();
    bus = new FakeOfferEventBus();
    useCase = new SubmitOffer(repo, bus, activeReader, nullNeedLookup);
  });

  it('creates an offer with Open status and returns its id', async () => {
    const result = await useCase.execute(makeCmd());
    expect(result.id).toBeDefined();
    const saved = await repo.findById({ value: result.id } as never);
    expect(saved).not.toBeNull();
    expect(saved!.status).toBe(OfferStatus.Open);
  });

  it('stores all fields correctly', async () => {
    const result = await useCase.execute(makeCmd());
    const saved = await repo.findById({ value: result.id } as never);
    expect(saved!.donorUserId).toBe(USER_ID);
    expect(saved!.category).toBe(Category.Food);
    expect(saved!.description).toBe('Rice bags 25kg');
    expect(saved!.quantity).toBe(50);
    expect(saved!.unit).toBe('bags');
    expect(saved!.location.address).toBe('Av. Principal, Caracas');
    expect(saved!.targetNeedId).toBeNull();
    expect(saved!.matchedNeedId).toBeNull();
  });

  it('publishes offer.created event', async () => {
    await useCase.execute(makeCmd());
    expect(bus.published.map((e) => e.eventName)).toEqual(['offer.created']);
  });

  it('stores targetNeedId when valid', async () => {
    const lookupWithNeed = new FakeNeedLookup(EM);
    const uc = new SubmitOffer(repo, bus, activeReader, lookupWithNeed);
    const result = await uc.execute(makeCmd({ targetNeedId: NEED_ID }));
    const saved = await repo.findById({ value: result.id } as never);
    expect(saved!.targetNeedId).toBe(NEED_ID);
    expect(saved!.status).toBe(OfferStatus.Open); // NOT auto-matched
  });

  it('throws TargetNeedNotFoundError when targetNeedId does not exist', async () => {
    const lookupNotFound = new FakeNeedLookup(null);
    const uc = new SubmitOffer(repo, bus, activeReader, lookupNotFound);
    await expect(
      uc.execute(makeCmd({ targetNeedId: NEED_ID })),
    ).rejects.toThrow(TargetNeedNotFoundError);
  });

  it('throws TargetNeedWrongEmergencyError when need belongs to different emergency', async () => {
    const lookupOtherEm = new FakeNeedLookup(OTHER_EM);
    const uc = new SubmitOffer(repo, bus, activeReader, lookupOtherEm);
    await expect(
      uc.execute(makeCmd({ targetNeedId: NEED_ID })),
    ).rejects.toThrow(TargetNeedWrongEmergencyError);
  });

  describe('kill-switch', () => {
    it('throws EmergencyNotAcceptingIntakeError when emergency is paused', async () => {
      const uc = new SubmitOffer(
        repo,
        bus,
        new FakeStatusReader('paused'),
        nullNeedLookup,
      );
      await expect(uc.execute(makeCmd())).rejects.toThrow(
        EmergencyNotAcceptingIntakeError,
      );
    });

    it('throws EmergencyNotAcceptingIntakeError when emergency does not exist', async () => {
      const uc = new SubmitOffer(
        repo,
        bus,
        new FakeStatusReader(null),
        nullNeedLookup,
      );
      await expect(uc.execute(makeCmd())).rejects.toThrow(
        EmergencyNotAcceptingIntakeError,
      );
    });
  });
});
