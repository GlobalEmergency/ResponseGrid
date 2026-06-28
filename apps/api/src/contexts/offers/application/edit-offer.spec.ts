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
      category: Category.Food,
      description: 'Arroz 25kg',
      quantity: 10,
      unit: 'sacos',
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
      description: 'Arroz blanco 25kg',
      quantity: 20,
      unit: 'bultos',
      notes: 'Solo fines de semana',
    });

    const offer = await repo.findById(OfferId.fromString(id));
    expect(offer!.description).toBe('Arroz blanco 25kg');
    expect(offer!.quantity).toBe(20);
    expect(offer!.unit).toBe('bultos');
    expect(offer!.notes).toBe('Solo fines de semana');

    expect(result.emergencyId).toBe(EM);
    expect(result.targetStatus).toBeNull();
    expect(result.changes).toEqual(
      expect.arrayContaining([
        {
          field: 'description',
          before: 'Arroz 25kg',
          after: 'Arroz blanco 25kg',
        },
        { field: 'quantity', before: 10, after: 20 },
        { field: 'unit', before: 'sacos', after: 'bultos' },
        {
          field: 'notes',
          before: 'Disponible lunes a viernes',
          after: 'Solo fines de semana',
        },
      ]),
    );
    expect(result.changes).toHaveLength(4);
  });

  it('leaves omitted fields untouched and reports no change for them', async () => {
    const id = await seed();

    const result = await editOffer.execute({
      offerId: id,
      description: 'Arroz blanco 25kg',
    });

    expect(result.changes).toEqual([
      {
        field: 'description',
        before: 'Arroz 25kg',
        after: 'Arroz blanco 25kg',
      },
    ]);
  });

  it('clears notes and unit when an empty string is given', async () => {
    const id = await seed();

    const result = await editOffer.execute({
      offerId: id,
      notes: '',
      unit: '',
    });

    const offer = await repo.findById(OfferId.fromString(id));
    expect(offer!.notes).toBeNull();
    expect(offer!.unit).toBeNull();
    expect(result.changes).toEqual(
      expect.arrayContaining([
        { field: 'unit', before: 'sacos', after: null },
        { field: 'notes', before: 'Disponible lunes a viernes', after: null },
      ]),
    );
    expect(result.changes).toHaveLength(2);
  });

  it('throws OfferNotFoundError for an unknown id', async () => {
    await expect(
      editOffer.execute({ offerId: UNKNOWN_ID, description: 'x' }),
    ).rejects.toThrow(OfferNotFoundError);
  });

  it('refuses to edit a discarded (cancelled) offer', async () => {
    const id = await seed();
    const offer = await repo.findById(OfferId.fromString(id));
    offer!.cancel();
    await repo.save(offer!);

    await expect(
      editOffer.execute({ offerId: id, description: 'x' }),
    ).rejects.toThrow(OfferNotEditableError);
  });

  it('reports an empty diff when nothing actually changed', async () => {
    const id = await seed();

    const result = await editOffer.execute({
      offerId: id,
      description: 'Arroz 25kg',
    });

    expect(result.changes).toEqual([]);
    const offer = await repo.findById(OfferId.fromString(id));
    expect(offer!.status).toBe(OfferStatus.Open);
  });
});
