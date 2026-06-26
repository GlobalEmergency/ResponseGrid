import { RegisterResource } from './register-resource';
import { InMemoryResourceRepository } from '../infrastructure/in-memory-resource.repository';
import { FakeEventBus } from '../infrastructure/fake-event-bus';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { ResourceType, ResourceStage, VerificationLevel } from '../domain/resource-enums';

const EM = '11111111-1111-4111-8111-111111111111';

const baseLocation = { address: 'Calle Mayor 1, Valencia', latitude: 39.4699, longitude: -0.3763 };

describe('RegisterResource', () => {
  it('persists an unverified resource and publishes ResourceRegistered', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const useCase = new RegisterResource(repo, bus);

    const { id } = await useCase.execute({
      emergencyId: EM,
      type: ResourceType.Warehouse,
      stage: ResourceStage.Origin,
      name: 'Almacén Norte',
      location: baseLocation,
      ownerUserId: 'user-test-1',
    });

    const pending = await repo.findPendingByEmergency(EmergencyId.fromString(EM));
    expect(pending).toHaveLength(1);
    expect(pending[0].id.value).toBe(id);
    expect(pending[0].verificationLevel).toBe(VerificationLevel.Unverified);
    expect(bus.published.map((e) => e.eventName)).toEqual(['resource.registered']);
  });

  it('persists stage, location, and owner on the aggregate', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const useCase = new RegisterResource(repo, bus);

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

    const pending = await repo.findPendingByEmergency(EmergencyId.fromString(EM));
    const resource = pending.find((r) => r.id.value === id);
    expect(resource?.stage).toBe(ResourceStage.Intermediate);
    expect(resource?.location.address).toBe('Calle Mayor 1, Valencia');
    expect(resource?.ownerUserId).toBe('user-test-2');
    expect(resource?.ownerOrganizationId).toBe('org-test-1');
    expect(resource?.description).toBe('Recogida y entrega');
  });
});
