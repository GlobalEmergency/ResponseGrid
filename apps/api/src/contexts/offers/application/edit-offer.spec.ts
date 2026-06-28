import { EditOffer } from './edit-offer';
import { SubmitOffer } from './submit-offer';
import { InMemoryOfferRepository } from '../infrastructure/in-memory-offer.repository';
import { FakeOfferEventBus } from '../infrastructure/fake-event-bus';
import { Category, OfferStatus } from '../domain/offer-enums';
import { OfferNotFoundError } from './offer-not-found.error';
import { OfferNotEditableError } from '../domain/offer-errors';
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

describe('EditOffer', () => {
  let repo: InMemoryOfferRepository;
  let bus: FakeOfferEventBus;
  let editOffer: EditOffer;
  let submitOffer: SubmitOffer;

  beforeEach(() => {
    repo = new InMemoryOfferRepository();
    bus = new FakeOfferEventBus();
    editOffer = new EditOffer(repo);
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
      items: [
        {
          name: 'Arroz 25kg',
          quantity: 10,
          unit: 'sacos',
          category: Category.Food,
          presentation: null,
        },
      ],
      location: { address: 'Caracas', latitude: 10.48, longitude: -66.9 },
      targetNeedId: null,
      notes: 'Disponible lunes a viernes',
    });
    bus.published = [];
    return id;
  }

  it('applies the changes and reports the before/after diff', async () => {
    const id = await seed();

    const result = await editOffer.execute({
      offerId: id,
      items: [
        {
          name: 'Arroz blanco 25kg',
          quantity: 20,
          unit: 'bultos',
          category: Category.Food,
          presentation: null,
        },
      ],
      notes: 'Solo fines de semana',
    });

    const offer = await repo.findById(OfferId.fromString(id));
    expect(offer!.items).toHaveLength(1);
    expect(offer!.items[0].name).toBe('Arroz blanco 25kg');
    expect(offer!.items[0].quantity).toBe(20);
    expect(offer!.items[0].unit).toBe('bultos');
    expect(offer!.notes).toBe('Solo fines de semana');

    expect(result.emergencyId).toBe(EM);
    expect(result.targetStatus).toBeNull();
    expect(result.changes).toHaveLength(2);
    expect(result.changes).toContainEqual({
      field: 'notes',
      before: 'Disponible lunes a viernes',
      after: 'Solo fines de semana',
    });
    const itemsChange = result.changes.find((c) => c.field === 'items');
    expect(itemsChange).toBeDefined();
    expect(String(itemsChange!.after)).toContain('Arroz blanco 25kg');
  });

  it('leaves omitted fields untouched and reports only what changed', async () => {
    const id = await seed();

    const result = await editOffer.execute({
      offerId: id,
      notes: 'Solo fines de semana',
    });

    expect(result.changes).toEqual([
      {
        field: 'notes',
        before: 'Disponible lunes a viernes',
        after: 'Solo fines de semana',
      },
    ]);
  });

  it('clears notes when an empty string is given', async () => {
    const id = await seed();

    const result = await editOffer.execute({ offerId: id, notes: '' });

    const offer = await repo.findById(OfferId.fromString(id));
    expect(offer!.notes).toBeNull();
    expect(result.changes).toEqual([
      {
        field: 'notes',
        before: 'Disponible lunes a viernes',
        after: null,
      },
    ]);
  });

  it('throws OfferNotFoundError for an unknown id', async () => {
    await expect(
      editOffer.execute({ offerId: UNKNOWN_ID, notes: 'x' }),
    ).rejects.toThrow(OfferNotFoundError);
  });

  it('refuses to edit a discarded (cancelled) offer', async () => {
    const id = await seed();
    const offer = await repo.findById(OfferId.fromString(id));
    offer!.cancel();
    await repo.save(offer!);

    await expect(
      editOffer.execute({ offerId: id, notes: 'x' }),
    ).rejects.toThrow(OfferNotEditableError);
  });

  it('reports an empty diff when nothing actually changed', async () => {
    const id = await seed();

    const result = await editOffer.execute({
      offerId: id,
      items: [
        {
          name: 'Arroz 25kg',
          quantity: 10,
          unit: 'sacos',
          category: Category.Food,
          presentation: null,
        },
      ],
    });

    expect(result.changes).toEqual([]);
    const offer = await repo.findById(OfferId.fromString(id));
    expect(offer!.status).toBe(OfferStatus.Open);
  });
});
