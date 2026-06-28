import { GetNeedsQueue } from './get-needs-queue';
import { CreateNeed } from './create-need';
import { ValidateNeed } from './validate-need';
import { InMemoryNeedRepository } from '../infrastructure/in-memory-need.repository';
import { FakeEventBus } from '../infrastructure/fake-event-bus';
import { Category, Priority, NeedStatus } from '../domain/need-enums';
import { NeedEmergencyStatusReader } from '../domain/ports/emergency-status-reader';

const EM = '11111111-1111-4111-8111-111111111111';
const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const activeReader: NeedEmergencyStatusReader = {
  getStatus: () => Promise.resolve('active'),
};

const baseCmd = {
  emergencyId: EM,
  requesterUserId: USER_ID,
  requesterOrganizationId: null,
  description: null,
  location: { address: 'Caracas', latitude: 10.4806, longitude: -66.9036 },
  items: [{ name: 'Food', quantity: 10, unit: null, category: Category.Food }],
};

describe('GetNeedsQueue', () => {
  let repo: InMemoryNeedRepository;
  let bus: FakeEventBus;
  let getNeedsQueue: GetNeedsQueue;
  let createNeed: CreateNeed;
  let validateNeed: ValidateNeed;

  beforeEach(() => {
    repo = new InMemoryNeedRepository();
    bus = new FakeEventBus();
    getNeedsQueue = new GetNeedsQueue(repo);
    createNeed = new CreateNeed(repo, bus, activeReader);
    validateNeed = new ValidateNeed(repo, bus);
  });

  it('returns only pending needs', async () => {
    const { id: id1 } = await createNeed.execute({
      ...baseCmd,
      title: 'Pending need',
      priority: Priority.High,
    });
    const { id: id2 } = await createNeed.execute({
      ...baseCmd,
      title: 'Will be validated',
      priority: Priority.Urgent,
    });

    await validateNeed.execute({ needId: id2 });

    const result = await getNeedsQueue.execute({ emergencyId: EM });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(id1);
    expect(result[0].status).toBe(NeedStatus.Pending);
  });

  it('includes items and location in pending view', async () => {
    const { id } = await createNeed.execute({
      ...baseCmd,
      title: 'Queue check',
      priority: Priority.Medium,
      items: [
        {
          name: 'Blankets',
          quantity: 30,
          unit: null,
          category: Category.Shelter,
        },
      ],
    });

    const result = await getNeedsQueue.execute({ emergencyId: EM });
    expect(result[0].id).toBe(id);
    expect(result[0].items).toHaveLength(1);
    expect(result[0].items[0].name).toBe('Blankets');
  });

  it('returns empty when all needs validated', async () => {
    const { id } = await createNeed.execute({
      ...baseCmd,
      title: 'Need',
      priority: Priority.Medium,
    });
    await validateNeed.execute({ needId: id });

    const result = await getNeedsQueue.execute({ emergencyId: EM });
    expect(result).toHaveLength(0);
  });

  // ── Filter: category ────────────────────────────────────────────────────────

  it('filters by category — returns only pending needs with at least one item of that category', async () => {
    await createNeed.execute({
      ...baseCmd,
      title: 'Food need',
      priority: Priority.High,
      items: [
        { name: 'Rice', quantity: 20, unit: null, category: Category.Food },
      ],
    });
    await createNeed.execute({
      ...baseCmd,
      title: 'Water need',
      priority: Priority.Medium,
      items: [
        {
          name: 'Bottles',
          quantity: 100,
          unit: null,
          category: Category.Water,
        },
      ],
    });

    const result = await getNeedsQueue.execute({
      emergencyId: EM,
      category: Category.Food,
    });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Food need');
  });

  it('filters by category — includes needs with mixed items if at least one matches', async () => {
    const { id } = await createNeed.execute({
      ...baseCmd,
      title: 'Mixed need',
      priority: Priority.High,
      items: [
        {
          name: 'Soap',
          quantity: 20,
          unit: null,
          category: Category.Hygiene,
        },
        { name: 'Rice', quantity: 10, unit: null, category: Category.Food },
      ],
    });

    const result = await getNeedsQueue.execute({
      emergencyId: EM,
      category: Category.Hygiene,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(id);
  });

  it('filters by category — returns empty when no pending needs match the category', async () => {
    await createNeed.execute({
      ...baseCmd,
      title: 'Shelter need',
      priority: Priority.Low,
      items: [
        {
          name: 'Tents',
          quantity: 5,
          unit: null,
          category: Category.Shelter,
        },
      ],
    });

    const result = await getNeedsQueue.execute({
      emergencyId: EM,
      category: Category.Medical,
    });
    expect(result).toHaveLength(0);
  });

  // ── Filter: priority ────────────────────────────────────────────────────────

  it('filters by priority — returns only pending needs matching that priority', async () => {
    const { id: urgentId } = await createNeed.execute({
      ...baseCmd,
      title: 'Urgent need',
      priority: Priority.Urgent,
    });
    await createNeed.execute({
      ...baseCmd,
      title: 'Low need',
      priority: Priority.Low,
    });

    const result = await getNeedsQueue.execute({
      emergencyId: EM,
      priority: Priority.Urgent,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(urgentId);
  });

  it('filters by priority — returns empty when no pending needs match', async () => {
    await createNeed.execute({
      ...baseCmd,
      title: 'Medium need',
      priority: Priority.Medium,
    });

    const result = await getNeedsQueue.execute({
      emergencyId: EM,
      priority: Priority.High,
    });
    expect(result).toHaveLength(0);
  });

  // ── Filter: category + priority combined ────────────────────────────────────

  it('filters by both category and priority — returns only matching pending needs', async () => {
    const { id: matchId } = await createNeed.execute({
      ...baseCmd,
      title: 'Urgent food',
      priority: Priority.Urgent,
      items: [
        {
          name: 'Canned food',
          quantity: 50,
          unit: null,
          category: Category.Food,
        },
      ],
    });
    await createNeed.execute({
      ...baseCmd,
      title: 'Low food',
      priority: Priority.Low,
      items: [
        {
          name: 'Bread',
          quantity: 10,
          unit: null,
          category: Category.Food,
        },
      ],
    });
    await createNeed.execute({
      ...baseCmd,
      title: 'Urgent water',
      priority: Priority.Urgent,
      items: [
        {
          name: 'Water',
          quantity: 100,
          unit: null,
          category: Category.Water,
        },
      ],
    });

    const result = await getNeedsQueue.execute({
      emergencyId: EM,
      category: Category.Food,
      priority: Priority.Urgent,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(matchId);
  });

  // ── No filters: existing behaviour unchanged ────────────────────────────────

  it('returns all pending needs when no filters are given', async () => {
    await createNeed.execute({
      ...baseCmd,
      title: 'Need 1',
      priority: Priority.Low,
    });
    await createNeed.execute({
      ...baseCmd,
      title: 'Need 2',
      priority: Priority.High,
    });

    const result = await getNeedsQueue.execute({ emergencyId: EM });
    expect(result).toHaveLength(2);
  });
});
