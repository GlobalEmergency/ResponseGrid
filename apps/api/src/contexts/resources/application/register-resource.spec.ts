import { RegisterResource } from './register-resource';
import { InMemoryResourceRepository } from '../infrastructure/in-memory-resource.repository';
import { FakeEventBus } from '../infrastructure/fake-event-bus';
import { EmergencyId } from '../domain/emergency-id';
import { ResourceType, ResourceSide, VerificationLevel } from '../domain/resource-enums';

const EM = '11111111-1111-4111-8111-111111111111';

describe('RegisterResource', () => {
  it('persists an unverified resource and publishes ResourceRegistered', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const useCase = new RegisterResource(repo, bus);

    const { id } = await useCase.execute({
      emergencyId: EM,
      type: ResourceType.Warehouse,
      side: ResourceSide.Origin,
      name: 'Almacén Norte',
    });

    const pending = await repo.findPendingByEmergency(EmergencyId.fromString(EM));
    expect(pending).toHaveLength(1);
    expect(pending[0].id.value).toBe(id);
    expect(pending[0].verificationLevel).toBe(VerificationLevel.Unverified);
    expect(bus.published.map((e) => e.eventName)).toEqual(['resource.registered']);
  });
});
