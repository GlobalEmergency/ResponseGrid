import { CreateDonationIntake } from './create-donation-intake';
import { GetDonationIntakeTracking } from './get-donation-intake-tracking';
import { ConfirmIntakeReception } from './confirm-intake-reception';
import { InMemoryDonationIntakeRepository } from '../infrastructure/in-memory-donation-intake.repository';
import { FakeOfferEventBus } from '../infrastructure/fake-event-bus';
import { OfferEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import {
  IntakeResourceLookup,
  IntakeResourceInfo,
} from '../domain/ports/intake-resource-lookup';
import { Category } from '../domain/offer-enums';
import { DonationIntakeStatus } from '../domain/donation-intake-enums';
import { DonationIntakeNotFoundError } from './donation-intake-not-found.error';

const EM = '11111111-1111-4111-8111-111111111111';
const RESOURCE = '33333333-3333-4333-8333-333333333331';

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

describe('GetDonationIntakeTracking', () => {
  let repo: InMemoryDonationIntakeRepository;
  let create: CreateDonationIntake;
  let track: GetDonationIntakeTracking;

  beforeEach(() => {
    repo = new InMemoryDonationIntakeRepository();
    create = new CreateDonationIntake(
      repo,
      new FakeStatusReader(),
      new FakeResourceLookup(RES),
    );
    track = new GetDonationIntakeTracking(repo, new FakeResourceLookup(RES));
  });

  const seed = () =>
    create.execute({
      emergencyId: EM,
      targetResourceId: RESOURCE,
      donorName: 'María',
      donorPhone: null,
      donorEmail: 'm@e.com',
      donorUserId: null,
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

  it('returns status, point name and lines for a pending intake (no PII)', async () => {
    const { intakeCode } = await seed();

    const t = await track.execute(EM, intakeCode);

    expect(t.status).toBe(DonationIntakeStatus.Pending);
    expect(t.resourceName).toBe('Acopio Centro');
    expect(t.receivedAt).toBeNull();
    expect(t.lines).toEqual([
      {
        name: 'Agua',
        quantity: 5,
        unit: 'l',
        category: Category.Water,
        supplyId: null,
        presentation: null,
      },
    ]);
    // No third-party PII leaks into the public view.
    expect(t).not.toHaveProperty('donorName');
    expect(t).not.toHaveProperty('donorEmail');
    expect(t).not.toHaveProperty('donorPhone');
  });

  it('reflects reception (received + receivedAt set)', async () => {
    const { id, intakeCode } = await seed();
    const confirm = new ConfirmIntakeReception(repo, new FakeOfferEventBus());
    await confirm.execute({
      intakeId: id,
      receivedByUserId: 'op-1',
      volunteerNotes: null,
      evidenceFileKey: null,
    });

    const t = await track.execute(EM, intakeCode);

    expect(t.status).toBe(DonationIntakeStatus.Received);
    expect(t.receivedAt).not.toBeNull();
  });

  it('tolerates an unresolved point (resourceName null)', async () => {
    const { intakeCode } = await seed();
    const trackNoRes = new GetDonationIntakeTracking(
      repo,
      new FakeResourceLookup(null),
    );

    const t = await trackNoRes.execute(EM, intakeCode);

    expect(t.resourceName).toBeNull();
    expect(t.status).toBe(DonationIntakeStatus.Pending);
  });

  it('throws when the code is unknown', async () => {
    await expect(track.execute(EM, 'ACO-XXXX')).rejects.toThrow(
      DonationIntakeNotFoundError,
    );
  });
});
