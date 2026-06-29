import { CreateDonationIntake } from './create-donation-intake';
import { GetMyDonationIntakes } from './get-my-donation-intakes';
import { InMemoryDonationIntakeRepository } from '../infrastructure/in-memory-donation-intake.repository';
import { OfferEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import {
  IntakeResourceLookup,
  IntakeResourceInfo,
} from '../domain/ports/intake-resource-lookup';
import { Category } from '../domain/offer-enums';

const EM = '11111111-1111-4111-8111-111111111111';
const RESOURCE = '33333333-3333-4333-8333-333333333331';
const USER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

class FakeStatusReader implements OfferEmergencyStatusReader {
  getStatus(): Promise<string | null> {
    return Promise.resolve('active');
  }
}

class FakeResourceLookup implements IntakeResourceLookup {
  constructor(private readonly r: IntakeResourceInfo | null) {}
  findForIntake(): Promise<IntakeResourceInfo | null> {
    return Promise.resolve(this.r);
  }
}

const RES: IntakeResourceInfo = {
  id: RESOURCE,
  emergencyId: EM,
  emergencySlug: 'demo',
  name: 'Acopio Centro',
  type: 'collection_point',
  publicStatus: 'active',
};

describe('GetMyDonationIntakes', () => {
  let repo: InMemoryDonationIntakeRepository;
  let create: CreateDonationIntake;
  let mine: GetMyDonationIntakes;

  beforeEach(() => {
    repo = new InMemoryDonationIntakeRepository();
    create = new CreateDonationIntake(
      repo,
      new FakeStatusReader(),
      new FakeResourceLookup(RES),
    );
    mine = new GetMyDonationIntakes(repo, new FakeResourceLookup(RES));
  });

  const seed = (donorUserId: string | null) =>
    create.execute({
      emergencyId: EM,
      targetResourceId: RESOURCE,
      donorName: 'Donante',
      donorPhone: null,
      donorEmail: 'd@e.com',
      donorUserId,
      items: [
        {
          category: Category.Water,
          name: 'Agua',
          quantity: 5,
          unit: 'l',
          presentation: null,
        },
      ],
    });

  it("returns only the donor's own intakes, with point + emergency resolved", async () => {
    const a1 = await seed(USER_A);
    await seed(USER_B);
    await seed(null);

    const result = await mine.execute(USER_A);

    expect(result).toHaveLength(1);
    expect(result[0].intakeCode).toBe(a1.intakeCode);
    expect(result[0].resourceName).toBe('Acopio Centro');
    expect(result[0].emergencySlug).toBe('demo');
    expect(result[0].itemCount).toBe(1);
    // No third-party PII leaks into the platform-level donor view.
    expect(result[0]).not.toHaveProperty('donorName');
    expect(result[0]).not.toHaveProperty('donorEmail');
  });

  it('lists every intake the donor made', async () => {
    await seed(USER_A);
    await seed(USER_A);

    const result = await mine.execute(USER_A);

    expect(result).toHaveLength(2);
    expect(result.every((r) => r.status === 'pending')).toBe(true);
  });

  it('tolerates an unresolved point (resourceName / emergencySlug null)', async () => {
    const a = await seed(USER_A);
    const mineNoRes = new GetMyDonationIntakes(
      repo,
      new FakeResourceLookup(null),
    );

    const result = await mineNoRes.execute(USER_A);

    expect(result).toHaveLength(1);
    expect(result[0].intakeCode).toBe(a.intakeCode);
    expect(result[0].resourceName).toBeNull();
    expect(result[0].emergencySlug).toBeNull();
  });

  it('returns an empty list when the donor has no intakes', async () => {
    const result = await mine.execute(USER_A);
    expect(result).toEqual([]);
  });
});
