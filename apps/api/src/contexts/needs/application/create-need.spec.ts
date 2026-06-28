import { CreateNeed, CreateNeedCommand } from './create-need';
import { InMemoryNeedRepository } from '../infrastructure/in-memory-need.repository';
import { FakeEventBus } from '../infrastructure/fake-event-bus';
import { Category, Priority, NeedStatus } from '../domain/need-enums';
import { NeedEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { EmergencyNotAcceptingIntakeError } from '../../emergencies/domain/emergency-not-accepting-intake.error';
import { LocationSensitivity } from '../../../shared/domain/location-sensitivity';

const EM = '11111111-1111-4111-8111-111111111111';
const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const defaultLocation = {
  address: '123 Aid Street, Caracas',
  latitude: 10.4806,
  longitude: -66.9036,
};

const defaultItems = [
  {
    name: 'Water bottles',
    quantity: 100,
    unit: 'units',
    category: Category.Water,
  },
];

/** Fake status reader returns a fixed status. */
class FakeNeedEmergencyStatusReader implements NeedEmergencyStatusReader {
  constructor(private readonly status: string | null) {}
  getStatus(_emergencyId: string): Promise<string | null> {
    return Promise.resolve(this.status);
  }
}

const activeReader = new FakeNeedEmergencyStatusReader('active');

function makeCmd(overrides?: Partial<CreateNeedCommand>): CreateNeedCommand {
  return {
    emergencyId: EM,
    requesterUserId: USER_ID,
    requesterOrganizationId: null,
    title: 'Food supplies',
    description: null,
    location: defaultLocation,
    priority: Priority.High,
    items: defaultItems,
    ...overrides,
  };
}

describe('CreateNeed', () => {
  let repo: InMemoryNeedRepository;
  let bus: FakeEventBus;
  let useCase: CreateNeed;

  beforeEach(() => {
    repo = new InMemoryNeedRepository();
    bus = new FakeEventBus();
    useCase = new CreateNeed(repo, bus, activeReader);
  });

  it('creates a need with Pending status and returns its id', async () => {
    const result = await useCase.execute(makeCmd());

    expect(result.id).toBeDefined();
    const saved = await repo.findById({ value: result.id } as never);
    expect(saved).not.toBeNull();
    expect(saved!.status).toBe(NeedStatus.Pending);
  });

  it('stores items on the created need', async () => {
    const result = await useCase.execute(
      makeCmd({
        items: [
          {
            name: 'Food boxes',
            quantity: 50,
            unit: 'boxes',
            category: Category.Food,
          },
          {
            name: 'Blankets',
            quantity: 20,
            unit: null,
            category: Category.Shelter,
          },
        ],
      }),
    );
    const saved = await repo.findById({ value: result.id } as never);
    expect(saved!.items).toHaveLength(2);
    expect(saved!.items[0].name).toBe('Food boxes');
    expect(saved!.items[1].name).toBe('Blankets');
  });

  it('stores location on the created need', async () => {
    const result = await useCase.execute(makeCmd());
    const saved = await repo.findById({ value: result.id } as never);
    expect(saved!.location.address).toBe('123 Aid Street, Caracas');
    expect(saved!.location.latitude).toBe(10.4806);
    expect(saved!.location.longitude).toBe(-66.9036);
  });

  it('stores requesterUserId on the created need', async () => {
    const result = await useCase.execute(makeCmd());
    const saved = await repo.findById({ value: result.id } as never);
    expect(saved!.requesterUserId).toBe(USER_ID);
    expect(saved!.managingOrganizationId).toBeNull();
  });

  it('stores optional requesterOrganizationId', async () => {
    const orgId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const result = await useCase.execute(
      makeCmd({ requesterOrganizationId: orgId }),
    );
    const saved = await repo.findById({ value: result.id } as never);
    expect(saved!.requesterOrganizationId).toBe(orgId);
  });

  it('publishes need.created event', async () => {
    await useCase.execute(makeCmd());
    expect(bus.published.map((e) => e.eventName)).toEqual(['need.created']);
  });

  it('rejects empty items array at domain level', async () => {
    await expect(useCase.execute(makeCmd({ items: [] }))).rejects.toThrow(
      'A need must have at least one item',
    );
  });

  it('handles null description', async () => {
    const result = await useCase.execute(makeCmd({ description: null }));
    const saved = await repo.findById({ value: result.id } as never);
    expect(saved!.description).toBeNull();
  });

  it('stores description when provided', async () => {
    const result = await useCase.execute(
      makeCmd({ description: 'Critical need near hospital' }),
    );
    const saved = await repo.findById({ value: result.id } as never);
    expect(saved!.description).toBe('Critical need near hospital');
  });

  // F09 — Location sensitivity auto-derivation
  describe('locationSensitivity', () => {
    it('sets approximate when requesterOrganizationId is null (individual requester)', async () => {
      const result = await useCase.execute(
        makeCmd({ requesterOrganizationId: null }),
      );
      const saved = await repo.findById({ value: result.id } as never);
      expect(saved!.locationSensitivity).toBe(LocationSensitivity.Approximate);
    });

    it('sets public when requesterOrganizationId is provided (organization)', async () => {
      const orgId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
      const result = await useCase.execute(
        makeCmd({ requesterOrganizationId: orgId }),
      );
      const saved = await repo.findById({ value: result.id } as never);
      expect(saved!.locationSensitivity).toBe(LocationSensitivity.Public);
    });
  });

  describe('kill-switch (emergency not accepting intake)', () => {
    it('throws EmergencyNotAcceptingIntakeError when emergency is paused', async () => {
      const pausedReader = new FakeNeedEmergencyStatusReader('paused');
      const uc = new CreateNeed(repo, bus, pausedReader);

      await expect(uc.execute(makeCmd())).rejects.toThrow(
        EmergencyNotAcceptingIntakeError,
      );
    });

    it('throws EmergencyNotAcceptingIntakeError when emergency is closed', async () => {
      const closedReader = new FakeNeedEmergencyStatusReader('closed');
      const uc = new CreateNeed(repo, bus, closedReader);

      await expect(uc.execute(makeCmd())).rejects.toThrow(
        EmergencyNotAcceptingIntakeError,
      );
    });

    it('throws EmergencyNotAcceptingIntakeError when emergency does not exist', async () => {
      const nullReader = new FakeNeedEmergencyStatusReader(null);
      const uc = new CreateNeed(repo, bus, nullReader);

      await expect(uc.execute(makeCmd())).rejects.toThrow(
        EmergencyNotAcceptingIntakeError,
      );
    });
  });
});
