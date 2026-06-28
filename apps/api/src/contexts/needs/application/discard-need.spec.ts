import { DiscardNeed } from './discard-need';
import { CreateNeed } from './create-need';
import { InMemoryNeedRepository } from '../infrastructure/in-memory-need.repository';
import { FakeEventBus } from '../infrastructure/fake-event-bus';
import { Category, Priority, NeedStatus } from '../domain/need-enums';
import { NeedNotFoundError } from './need-not-found.error';
import { NeedNotPendingError } from '../domain/need-errors';
import { NeedEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { NeedId } from '../domain/need-id';

const EM = '11111111-1111-4111-8111-111111111111';
const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const activeReader: NeedEmergencyStatusReader = {
  getStatus: () => Promise.resolve('active'),
};

describe('DiscardNeed', () => {
  let repo: InMemoryNeedRepository;
  let bus: FakeEventBus;
  let discardNeed: DiscardNeed;
  let createNeed: CreateNeed;

  beforeEach(() => {
    repo = new InMemoryNeedRepository();
    bus = new FakeEventBus();
    discardNeed = new DiscardNeed(repo, bus);
    createNeed = new CreateNeed(repo, bus, activeReader);
  });

  async function seed(): Promise<string> {
    const { id } = await createNeed.execute({
      emergencyId: EM,
      requesterUserId: USER_ID,
      requesterOrganizationId: null,
      title: 'Agua',
      description: null,
      location: { address: 'Caracas', latitude: 10.48, longitude: -66.9 },
      priority: Priority.Medium,
      items: [
        {
          name: 'Botellas',
          quantity: 10,
          unit: 'u',
          category: Category.Water,
        },
      ],
    });
    bus.published = [];
    return id;
  }

  it('transitions the need to rejected and reports the status change', async () => {
    const id = await seed();

    const result = await discardNeed.execute({ needId: id });

    const need = await repo.findById(NeedId.fromString(id));
    expect(need!.status).toBe(NeedStatus.Rejected);

    expect(result.emergencyId).toBe(EM);
    expect(result.targetStatus).toBe(NeedStatus.Rejected);
    expect(result.changes).toEqual([
      {
        field: 'status',
        before: NeedStatus.Pending,
        after: NeedStatus.Rejected,
      },
    ]);
    expect(bus.published.map((e) => e.eventName)).toEqual(['need.rejected']);
  });

  it('throws NeedNotFoundError for an unknown id', async () => {
    await expect(discardNeed.execute({ needId: USER_ID })).rejects.toThrow(
      NeedNotFoundError,
    );
  });

  it('cannot discard a need that is not pending', async () => {
    const id = await seed();
    await discardNeed.execute({ needId: id });

    await expect(discardNeed.execute({ needId: id })).rejects.toThrow(
      NeedNotPendingError,
    );
  });
});
