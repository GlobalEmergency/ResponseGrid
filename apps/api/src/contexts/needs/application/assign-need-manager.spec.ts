import { AssignNeedManager } from './assign-need-manager';
import { CreateNeed } from './create-need';
import { InMemoryNeedRepository } from '../infrastructure/in-memory-need.repository';
import { FakeEventBus } from '../infrastructure/fake-event-bus';
import { Category, Priority } from '../domain/need-enums';
import { NeedNotFoundError } from './need-not-found.error';
import { NeedEmergencyStatusReader } from '../domain/ports/emergency-status-reader';

const EM = '11111111-1111-4111-8111-111111111111';
const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORG_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const activeReader: NeedEmergencyStatusReader = {
  getStatus: () => Promise.resolve('active'),
};

describe('AssignNeedManager', () => {
  let repo: InMemoryNeedRepository;
  let bus: FakeEventBus;
  let assignManager: AssignNeedManager;
  let createNeed: CreateNeed;

  beforeEach(() => {
    repo = new InMemoryNeedRepository();
    bus = new FakeEventBus();
    assignManager = new AssignNeedManager(repo);
    createNeed = new CreateNeed(repo, bus, activeReader);
  });

  it('sets managingOrganizationId on an existing need', async () => {
    const { id } = await createNeed.execute({
      emergencyId: EM,
      requesterUserId: USER_ID,
      requesterOrganizationId: null,
      title: 'Water need',
      description: null,
      location: { address: 'Caracas', latitude: 10.4806, longitude: -66.9036 },
      priority: Priority.High,
      items: [
        {
          name: 'Water',
          quantity: 10,
          unit: 'liters',
          category: Category.Water,
        },
      ],
    });

    await assignManager.execute({ needId: id, organizationId: ORG_ID });

    const saved = await repo.findById({ value: id } as never);
    expect(saved!.managingOrganizationId).toBe(ORG_ID);
  });

  it('throws NeedNotFoundError for unknown needId', async () => {
    await expect(
      assignManager.execute({
        needId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        organizationId: ORG_ID,
      }),
    ).rejects.toThrow(NeedNotFoundError);
  });

  it('can be called regardless of need status', async () => {
    // Create and validate
    const { id } = await createNeed.execute({
      emergencyId: EM,
      requesterUserId: USER_ID,
      requesterOrganizationId: null,
      title: 'Medical need',
      description: null,
      location: { address: 'Caracas', latitude: 10.4806, longitude: -66.9036 },
      priority: Priority.Urgent,
      items: [
        {
          name: 'Kits',
          quantity: 5,
          unit: 'kits',
          category: Category.Medical,
        },
      ],
    });

    // Validate via repo
    const need = await repo.findById({ value: id } as never);
    need!.validate();
    await repo.save(need!);

    // Assign manager after validation
    await assignManager.execute({ needId: id, organizationId: ORG_ID });

    const saved = await repo.findById({ value: id } as never);
    expect(saved!.managingOrganizationId).toBe(ORG_ID);
  });
});
