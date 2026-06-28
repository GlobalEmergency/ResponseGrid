import { RegisterResource } from './register-resource';
import { InMemoryResourceRepository } from '../infrastructure/in-memory-resource.repository';
import { FakeEventBus } from '../infrastructure/fake-event-bus';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import {
  ResourceType,
  ResourceStage,
  VerificationLevel,
} from '../domain/resource-enums';
import { Category } from '../../supplies/domain/category';
import { ResourceEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { EmergencyNotAcceptingIntakeError } from '../../emergencies/domain/emergency-not-accepting-intake.error';

const EM = '11111111-1111-4111-8111-111111111111';

const baseLocation = {
  address: 'Calle Mayor 1, Valencia',
  latitude: 39.4699,
  longitude: -0.3763,
};

/** Fake that returns a fixed status — simulates the emergencies table read. */
class FakeEmergencyStatusReader implements ResourceEmergencyStatusReader {
  constructor(private readonly status: string | null) {}
  getStatus(_emergencyId: string): Promise<string | null> {
    return Promise.resolve(this.status);
  }
}

const activeReader = new FakeEmergencyStatusReader('active');

describe('RegisterResource', () => {
  it('persists an unverified resource and publishes ResourceRegistered', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const useCase = new RegisterResource(repo, bus, activeReader);

    const { id } = await useCase.execute({
      emergencyId: EM,
      type: ResourceType.Warehouse,
      stage: ResourceStage.Origin,
      name: 'Almacén Norte',
      location: baseLocation,
      ownerUserId: 'user-test-1',
    });

    const pending = await repo.findPendingByEmergency(
      EmergencyId.fromString(EM),
    );
    expect(pending).toHaveLength(1);
    expect(pending[0].id.value).toBe(id);
    expect(pending[0].verificationLevel).toBe(VerificationLevel.Unverified);
    expect(bus.published.map((e) => e.eventName)).toEqual([
      'resource.registered',
    ]);
  });

  it('persists stage, location, and owner on the aggregate', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const useCase = new RegisterResource(repo, bus, activeReader);

    const { id } = await useCase.execute({
      emergencyId: EM,
      type: ResourceType.CollectionAndDelivery,
      stage: ResourceStage.Intermediate,
      name: 'Punto Mixto',
      description: 'Recogida y entrega',
      location: baseLocation,
      ownerUserId: 'user-test-2',
      ownerOrganizationId: 'org-test-1',
    });

    const pending = await repo.findPendingByEmergency(
      EmergencyId.fromString(EM),
    );
    const resource = pending.find((r) => r.id.value === id);
    expect(resource?.stage).toBe(ResourceStage.Intermediate);
    expect(resource?.location.address).toBe('Calle Mayor 1, Valencia');
    expect(resource?.ownerUserId).toBe('user-test-2');
    expect(resource?.ownerOrganizationId).toBe('org-test-1');
    expect(resource?.description).toBe('Recogida y entrega');
  });

  it('persists declared inventory items on the aggregate', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const useCase = new RegisterResource(repo, bus, activeReader);

    const { id } = await useCase.execute({
      emergencyId: EM,
      type: ResourceType.Warehouse,
      stage: ResourceStage.Origin,
      name: 'Almacén con stock',
      location: baseLocation,
      ownerUserId: 'user-test-items',
      items: [
        {
          name: 'Agua embotellada',
          quantity: 200,
          unit: 'litros',
          category: Category.Water,
        },
        { name: 'Mantas', quantity: 50, category: Category.Shelter },
      ],
    });

    const pending = await repo.findPendingByEmergency(
      EmergencyId.fromString(EM),
    );
    const resource = pending.find((r) => r.id.value === id);
    expect(resource?.items).toHaveLength(2);
    expect(resource?.items[0]).toMatchObject({
      name: 'Agua embotellada',
      quantity: 200,
      unit: 'litros',
      category: 'water',
    });
    expect(resource?.items[1]).toMatchObject({
      name: 'Mantas',
      quantity: 50,
      unit: null,
      category: 'shelter',
    });
  });

  it('defaults to an empty inventory when no items are provided', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const useCase = new RegisterResource(repo, bus, activeReader);

    const { id } = await useCase.execute({
      emergencyId: EM,
      type: ResourceType.Warehouse,
      stage: ResourceStage.Origin,
      name: 'Almacén sin stock',
      location: baseLocation,
      ownerUserId: 'user-test-noitems',
    });

    const pending = await repo.findPendingByEmergency(
      EmergencyId.fromString(EM),
    );
    expect(pending.find((r) => r.id.value === id)?.items).toEqual([]);
  });

  it('throws EmergencyNotAcceptingIntakeError when emergency is paused', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const pausedReader = new FakeEmergencyStatusReader('paused');
    const useCase = new RegisterResource(repo, bus, pausedReader);

    await expect(
      useCase.execute({
        emergencyId: EM,
        type: ResourceType.Warehouse,
        stage: ResourceStage.Origin,
        name: 'Should Fail',
        location: baseLocation,
        ownerUserId: 'user-test-3',
      }),
    ).rejects.toThrow(EmergencyNotAcceptingIntakeError);
  });

  it('throws EmergencyNotAcceptingIntakeError when emergency is closed', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const closedReader = new FakeEmergencyStatusReader('closed');
    const useCase = new RegisterResource(repo, bus, closedReader);

    await expect(
      useCase.execute({
        emergencyId: EM,
        type: ResourceType.Warehouse,
        stage: ResourceStage.Origin,
        name: 'Should Also Fail',
        location: baseLocation,
        ownerUserId: 'user-test-4',
      }),
    ).rejects.toThrow(EmergencyNotAcceptingIntakeError);
  });

  it('throws EmergencyNotAcceptingIntakeError when emergency does not exist', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const nullReader = new FakeEmergencyStatusReader(null);
    const useCase = new RegisterResource(repo, bus, nullReader);

    await expect(
      useCase.execute({
        emergencyId: EM,
        type: ResourceType.Warehouse,
        stage: ResourceStage.Origin,
        name: 'Non-existent emergency',
        location: baseLocation,
        ownerUserId: 'user-test-5',
      }),
    ).rejects.toThrow(EmergencyNotAcceptingIntakeError);
  });
});
