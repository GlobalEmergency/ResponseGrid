import { GetPublicNeeds } from './get-public-needs';
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
  items: [
    { name: 'Water', quantity: 10, unit: null, category: Category.Water },
  ],
};

describe('GetPublicNeeds', () => {
  let repo: InMemoryNeedRepository;
  let bus: FakeEventBus;
  let getPublicNeeds: GetPublicNeeds;
  let createNeed: CreateNeed;
  let validateNeed: ValidateNeed;

  beforeEach(() => {
    repo = new InMemoryNeedRepository();
    bus = new FakeEventBus();
    getPublicNeeds = new GetPublicNeeds(repo);
    createNeed = new CreateNeed(repo, bus, activeReader);
    validateNeed = new ValidateNeed(repo, bus);
  });

  it('returns only validated needs', async () => {
    const { id: id1 } = await createNeed.execute({
      ...baseCmd,
      title: 'Validated need',
      priority: Priority.High,
    });
    await createNeed.execute({
      ...baseCmd,
      title: 'Still pending',
      priority: Priority.Medium,
    });

    await validateNeed.execute({ needId: id1 });

    const result = await getPublicNeeds.execute({ emergencyId: EM });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(id1);
    expect(result[0].status).toBe(NeedStatus.Validated);
  });

  it('includes items, location and description in view', async () => {
    const { id } = await createNeed.execute({
      ...baseCmd,
      title: 'Rich need',
      priority: Priority.Urgent,
      description: 'Urgent water need',
      location: {
        address: 'Plaza Bolívar, Caracas',
        latitude: 10.48,
        longitude: -66.9,
      },
      items: [
        {
          name: 'Water',
          quantity: 100,
          unit: 'liters',
          category: Category.Water,
        },
        {
          name: 'Food',
          quantity: 50,
          unit: 'boxes',
          category: Category.Food,
        },
      ],
    });
    await validateNeed.execute({ needId: id });

    const result = await getPublicNeeds.execute({ emergencyId: EM });
    expect(result[0].description).toBe('Urgent water need');
    expect(result[0].location.address).toBe('Plaza Bolívar, Caracas');
    expect(result[0].items).toHaveLength(2);
  });

  it('returns empty array when no validated needs', async () => {
    await createNeed.execute({
      ...baseCmd,
      title: 'Pending need',
      priority: Priority.Low,
    });
    const result = await getPublicNeeds.execute({ emergencyId: EM });
    expect(result).toHaveLength(0);
  });

  // ── Filter: category ────────────────────────────────────────────────────────

  it('filters by category — returns only needs with at least one item of that category', async () => {
    const { id: foodId } = await createNeed.execute({
      ...baseCmd,
      title: 'Food need',
      priority: Priority.High,
      items: [
        { name: 'Rice', quantity: 20, unit: null, category: Category.Food },
      ],
    });
    const { id: waterId } = await createNeed.execute({
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

    await validateNeed.execute({ needId: foodId });
    await validateNeed.execute({ needId: waterId });

    const result = await getPublicNeeds.execute({
      emergencyId: EM,
      category: Category.Food,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(foodId);
  });

  it('filters by category — includes needs with mixed items if at least one matches', async () => {
    const { id } = await createNeed.execute({
      ...baseCmd,
      title: 'Mixed need',
      priority: Priority.High,
      items: [
        { name: 'Rice', quantity: 20, unit: null, category: Category.Food },
        {
          name: 'Bandages',
          quantity: 50,
          unit: null,
          category: Category.Medical,
        },
      ],
    });
    await validateNeed.execute({ needId: id });

    const result = await getPublicNeeds.execute({
      emergencyId: EM,
      category: Category.Medical,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(id);
  });

  it('filters by category — returns empty when no needs match the category', async () => {
    const { id } = await createNeed.execute({
      ...baseCmd,
      title: 'Water only',
      priority: Priority.Low,
      items: [
        {
          name: 'Water',
          quantity: 10,
          unit: null,
          category: Category.Water,
        },
      ],
    });
    await validateNeed.execute({ needId: id });

    const result = await getPublicNeeds.execute({
      emergencyId: EM,
      category: Category.Tools,
    });
    expect(result).toHaveLength(0);
  });

  // ── Filter: priority ────────────────────────────────────────────────────────

  it('filters by priority — returns only needs matching that priority', async () => {
    const { id: urgentId } = await createNeed.execute({
      ...baseCmd,
      title: 'Urgent need',
      priority: Priority.Urgent,
    });
    const { id: lowId } = await createNeed.execute({
      ...baseCmd,
      title: 'Low need',
      priority: Priority.Low,
    });

    await validateNeed.execute({ needId: urgentId });
    await validateNeed.execute({ needId: lowId });

    const result = await getPublicNeeds.execute({
      emergencyId: EM,
      priority: Priority.Urgent,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(urgentId);
  });

  it('filters by priority — returns empty when no needs match', async () => {
    const { id } = await createNeed.execute({
      ...baseCmd,
      title: 'Medium need',
      priority: Priority.Medium,
    });
    await validateNeed.execute({ needId: id });

    const result = await getPublicNeeds.execute({
      emergencyId: EM,
      priority: Priority.Urgent,
    });
    expect(result).toHaveLength(0);
  });

  // ── Filter: category + priority combined ────────────────────────────────────

  it('filters by both category and priority — returns only matching needs', async () => {
    const { id: matchId } = await createNeed.execute({
      ...baseCmd,
      title: 'Urgent food',
      priority: Priority.Urgent,
      items: [
        { name: 'Rice', quantity: 10, unit: null, category: Category.Food },
      ],
    });
    const { id: wrongPrioId } = await createNeed.execute({
      ...baseCmd,
      title: 'Low food',
      priority: Priority.Low,
      items: [
        { name: 'Bread', quantity: 5, unit: null, category: Category.Food },
      ],
    });
    const { id: wrongCatId } = await createNeed.execute({
      ...baseCmd,
      title: 'Urgent water',
      priority: Priority.Urgent,
      items: [
        {
          name: 'Water',
          quantity: 20,
          unit: null,
          category: Category.Water,
        },
      ],
    });

    await validateNeed.execute({ needId: matchId });
    await validateNeed.execute({ needId: wrongPrioId });
    await validateNeed.execute({ needId: wrongCatId });

    const result = await getPublicNeeds.execute({
      emergencyId: EM,
      category: Category.Food,
      priority: Priority.Urgent,
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(matchId);
  });

  // ── No filters: existing behaviour unchanged ────────────────────────────────

  it('returns all validated needs when no filters are given', async () => {
    const { id: id1 } = await createNeed.execute({
      ...baseCmd,
      title: 'Need 1',
      priority: Priority.Low,
    });
    const { id: id2 } = await createNeed.execute({
      ...baseCmd,
      title: 'Need 2',
      priority: Priority.High,
    });
    await validateNeed.execute({ needId: id1 });
    await validateNeed.execute({ needId: id2 });

    const result = await getPublicNeeds.execute({ emergencyId: EM });
    expect(result).toHaveLength(2);
  });
});
