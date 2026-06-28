import { ValidateNeed } from './validate-need';
import { CreateNeed } from './create-need';
import { InMemoryNeedRepository } from '../infrastructure/in-memory-need.repository';
import { FakeEventBus } from '../infrastructure/fake-event-bus';
import { Category, Priority, NeedStatus } from '../domain/need-enums';
import { NeedNotFoundError } from './need-not-found.error';
import { NeedEmergencyStatusReader } from '../domain/ports/emergency-status-reader';

const EM = '11111111-1111-4111-8111-111111111111';
const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const activeReader: NeedEmergencyStatusReader = {
  getStatus: () => Promise.resolve('active'),
};

describe('ValidateNeed', () => {
  let repo: InMemoryNeedRepository;
  let bus: FakeEventBus;
  let validateNeed: ValidateNeed;
  let createNeed: CreateNeed;

  beforeEach(() => {
    repo = new InMemoryNeedRepository();
    bus = new FakeEventBus();
    validateNeed = new ValidateNeed(repo, bus);
    createNeed = new CreateNeed(repo, bus, activeReader);
  });

  it('transitions need to Validated status', async () => {
    const { id } = await createNeed.execute({
      emergencyId: EM,
      requesterUserId: USER_ID,
      requesterOrganizationId: null,
      title: 'Medical supplies',
      description: null,
      location: { address: 'Caracas', latitude: 10.4806, longitude: -66.9036 },
      priority: Priority.Urgent,
      items: [
        {
          name: 'Kits',
          quantity: 10,
          unit: 'kits',
          category: Category.Medical,
        },
      ],
    });
    bus.published = [];

    await validateNeed.execute({ needId: id });

    const need = await repo.findById({ value: id } as never);
    expect(need!.status).toBe(NeedStatus.Validated);
    expect(bus.published.map((e) => e.eventName)).toEqual(['need.validated']);
  });

  it('throws NeedNotFoundError for unknown id', async () => {
    await expect(
      validateNeed.execute({ needId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }),
    ).rejects.toThrow(NeedNotFoundError);
  });
});
