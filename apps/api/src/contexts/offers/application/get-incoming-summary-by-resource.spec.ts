import { CreateDonationIntake } from './create-donation-intake';
import { GetIncomingSummaryByResource } from './get-incoming-summary-by-resource';
import { InMemoryDonationIntakeRepository } from '../infrastructure/in-memory-donation-intake.repository';
import { OfferEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import {
  IntakeResourceLookup,
  IntakeResourceInfo,
} from '../domain/ports/intake-resource-lookup';
import { Category } from '../domain/offer-enums';
import { SupplyLineProps } from '../../supplies/domain/supply-line';

const EM = '11111111-1111-4111-8111-111111111111';
const RESOURCE = '33333333-3333-4333-8333-333333333331';

class FakeStatusReader implements OfferEmergencyStatusReader {
  getStatus(): Promise<string | null> {
    return Promise.resolve('active');
  }
}

class FakeResourceLookup implements IntakeResourceLookup {
  findForIntake(): Promise<IntakeResourceInfo | null> {
    return Promise.resolve({
      id: RESOURCE,
      emergencyId: EM,
      emergencySlug: 'demo',
      name: 'Acopio Centro',
      type: 'collection_point',
      publicStatus: 'active',
    });
  }
}

describe('GetIncomingSummaryByResource', () => {
  let repo: InMemoryDonationIntakeRepository;
  let create: CreateDonationIntake;
  let summary: GetIncomingSummaryByResource;

  beforeEach(() => {
    repo = new InMemoryDonationIntakeRepository();
    create = new CreateDonationIntake(
      repo,
      new FakeStatusReader(),
      new FakeResourceLookup(),
    );
    summary = new GetIncomingSummaryByResource(repo);
  });

  const seed = (items: SupplyLineProps[]) =>
    create.execute({
      emergencyId: EM,
      targetResourceId: RESOURCE,
      donorName: 'Donante',
      donorPhone: null,
      donorEmail: 'd@e.com',
      donorUserId: null,
      items,
    });

  it('aggregates pending lines by name+category+unit and counts intakes', async () => {
    await seed([
      {
        category: Category.Water,
        name: 'Agua',
        quantity: 100,
        unit: 'l',
        presentation: null,
      },
      {
        category: Category.Food,
        name: 'Arroz',
        quantity: 5,
        unit: 'kg',
        presentation: null,
      },
    ]);
    await seed([
      {
        category: Category.Water,
        name: 'Agua',
        quantity: 50,
        unit: 'l',
        presentation: null,
      },
    ]);

    const s = await summary.execute(RESOURCE);

    expect(s.totalPendingIntakes).toBe(2);
    const agua = s.lines.find((l) => l.name === 'Agua' && l.unit === 'l');
    expect(agua?.totalQuantity).toBe(150);
    expect(agua?.intakeCount).toBe(2);
    const arroz = s.lines.find((l) => l.name === 'Arroz');
    expect(arroz?.totalQuantity).toBe(5);
    expect(arroz?.intakeCount).toBe(1);
  });

  it('keeps lines distinct when the unit differs', async () => {
    await seed([
      {
        category: Category.Water,
        name: 'Agua',
        quantity: 100,
        unit: 'l',
        presentation: null,
      },
      {
        category: Category.Water,
        name: 'Agua',
        quantity: 4,
        unit: 'cajas',
        presentation: null,
      },
    ]);

    const s = await summary.execute(RESOURCE);

    expect(s.lines).toHaveLength(2);
  });

  it('returns an empty summary when there are no pending intakes', async () => {
    const s = await summary.execute(RESOURCE);
    expect(s.totalPendingIntakes).toBe(0);
    expect(s.lines).toEqual([]);
  });
});
