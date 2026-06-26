import { VerifyResource } from './verify-resource';
import { RegisterResource } from './register-resource';
import { ResourceNotFoundError } from './resource-not-found.error';
import { InMemoryResourceRepository } from '../infrastructure/in-memory-resource.repository';
import { FakeEventBus } from '../infrastructure/fake-event-bus';
import { ResourceId } from '../domain/resource-id';
import {
  ResourceType,
  ResourceStage,
  VerificationLevel,
} from '../domain/resource-enums';
import { ResourceEmergencyStatusReader } from '../domain/ports/emergency-status-reader';

const EM = '11111111-1111-4111-8111-111111111111';
const baseLocation = {
  address: 'Av. Diagonal 123, Barcelona',
  latitude: 41.3851,
  longitude: 2.1734,
};

const activeReader: ResourceEmergencyStatusReader = {
  getStatus: () => Promise.resolve('active'),
};

describe('VerifyResource', () => {
  it('sets the level and publishes ResourceVerified', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const { id } = await new RegisterResource(repo, bus, activeReader).execute({
      emergencyId: EM,
      type: ResourceType.Warehouse,
      stage: ResourceStage.Origin,
      name: 'Almacén',
      location: baseLocation,
      ownerUserId: 'user-verify-test',
    });
    bus.published = [];

    await new VerifyResource(repo, bus).execute({
      resourceId: id,
      level: VerificationLevel.Official,
      coordinatorId: 'c1',
    });

    const found = await repo.findById(ResourceId.fromString(id));
    expect(found?.verificationLevel).toBe(VerificationLevel.Official);
    expect(bus.published.map((e) => e.eventName)).toEqual([
      'resource.verified',
    ]);
  });

  it('throws ResourceNotFoundError for an unknown id', async () => {
    const repo = new InMemoryResourceRepository();
    await expect(
      new VerifyResource(repo, new FakeEventBus()).execute({
        resourceId: '99999999-9999-4999-8999-999999999999',
        level: VerificationLevel.Verified,
        coordinatorId: 'c1',
      }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
  });
});
