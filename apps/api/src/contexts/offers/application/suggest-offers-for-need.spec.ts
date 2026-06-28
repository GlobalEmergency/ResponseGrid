import { SuggestOffersForNeedWithLocation } from './suggest-offers-for-need';
import { SubmitOffer } from './submit-offer';
import { InMemoryOfferRepository } from '../infrastructure/in-memory-offer.repository';
import { FakeOfferEventBus } from '../infrastructure/fake-event-bus';
import { Category } from '../domain/offer-enums';
import { NeedForSuggestNotFoundError } from './suggest-offers-for-need';
import { OfferEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { NeedLookup } from '../domain/ports/need-lookup';

const EM = '11111111-1111-4111-8111-111111111111';
const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const NEED_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

class FakeActiveReader implements OfferEmergencyStatusReader {
  getStatus(_id: string): Promise<string | null> {
    return Promise.resolve('active');
  }
}

class ConfigurableNeedLookup implements NeedLookup {
  constructor(
    private readonly emergencyId: string | null,
    private readonly category: string | null,
  ) {}
  findEmergencyId(_id: string): Promise<string | null> {
    return Promise.resolve(this.emergencyId);
  }
  findCategory(_id: string): Promise<string | null> {
    return Promise.resolve(this.category);
  }
  findLocation(_id: string): Promise<{
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

describe('SuggestOffersForNeed', () => {
  let repo: InMemoryOfferRepository;
  let bus: FakeOfferEventBus;

  async function createOffer(category: Category, lat: number, lon: number) {
    const uc = new SubmitOffer(
      repo,
      bus,
      new FakeActiveReader(),
      new ConfigurableNeedLookup(null, null),
    );
    const result = await uc.execute({
      emergencyId: EM,
      donorUserId: USER_ID,
      donorOrganizationId: null,
      category,
      description: `Offer ${category}`,
      quantity: 10,
      unit: null,
      location: { address: 'Test', latitude: lat, longitude: lon },
      targetNeedId: null,
      notes: null,
    });
    bus.published = [];
    return result.id;
  }

  beforeEach(() => {
    repo = new InMemoryOfferRepository();
    bus = new FakeOfferEventBus();
  });

  it('returns only Open offers of the same category', async () => {
    await createOffer(Category.Food, 10.4, -66.9);
    await createOffer(Category.Medical, 10.5, -66.8); // different category

    const needLookup = new ConfigurableNeedLookup(EM, Category.Food);
    const uc = new SuggestOffersForNeedWithLocation(repo, needLookup);
    const result = await uc.execute({
      needId: NEED_ID,
      emergencyId: EM,
      needLatitude: 10.4,
      needLongitude: -66.9,
    });

    expect(result.length).toBe(1);
    expect(result[0].category).toBe(Category.Food);
  });

  it('sorts results by proximity (closest first)', async () => {
    const farId = await createOffer(Category.Water, 15.0, -60.0); // far
    const closeId = await createOffer(Category.Water, 10.48, -66.9); // close

    const needLookup = new ConfigurableNeedLookup(EM, Category.Water);
    const uc = new SuggestOffersForNeedWithLocation(repo, needLookup);
    const result = await uc.execute({
      needId: NEED_ID,
      emergencyId: EM,
      needLatitude: 10.48,
      needLongitude: -66.9,
    });

    expect(result.length).toBe(2);
    expect(result[0].id).toBe(closeId);
    expect(result[1].id).toBe(farId);
  });

  it('throws NeedForSuggestNotFoundError when need does not exist', async () => {
    const lookup = new ConfigurableNeedLookup(null, null);
    const uc = new SuggestOffersForNeedWithLocation(repo, lookup);
    await expect(
      uc.execute({
        needId: NEED_ID,
        emergencyId: EM,
        needLatitude: 10.0,
        needLongitude: -66.0,
      }),
    ).rejects.toThrow(NeedForSuggestNotFoundError);
  });
});
