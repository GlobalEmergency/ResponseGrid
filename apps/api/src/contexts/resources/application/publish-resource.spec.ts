import { PublishResource } from './publish-resource';
import { VerifyResource } from './verify-resource';
import { RegisterResource } from './register-resource';
import { InMemoryResourceRepository } from '../infrastructure/in-memory-resource.repository';
import { FakeEventBus } from '../infrastructure/fake-event-bus';
import { ResourceId } from '../domain/resource-id';
import {
  ResourceType,
  VerificationLevel,
  PublicStatus,
} from '../domain/resource-enums';
import { ResourceNotVerifiedError } from '../domain/resource-errors';
import { ResourceEmergencyStatusReader } from '../domain/ports/emergency-status-reader';

const EM = '11111111-1111-4111-8111-111111111111';
const baseLocation = {
  address: 'Gran Vía 44, Madrid',
  latitude: 40.4201,
  longitude: -3.7057,
};

const activeReader: ResourceEmergencyStatusReader = {
  getStatus: () => Promise.resolve('active'),
};

describe('PublishResource', () => {
  it('publishes a verified resource and emits ResourcePublished', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const { id } = await new RegisterResource(repo, bus, activeReader).execute({
      emergencyId: EM,
      type: ResourceType.CollectionPoint,
      name: 'Punto',
      location: baseLocation,
      ownerUserId: 'user-publish-test',
    });
    await new VerifyResource(repo, bus).execute({
      resourceId: id,
      level: VerificationLevel.Verified,
      coordinatorId: 'c1',
    });
    bus.published = [];

    await new PublishResource(repo, bus).execute({ resourceId: id });

    const found = await repo.findById(ResourceId.fromString(id));
    expect(found?.publicStatus).toBe(PublicStatus.Active);
    expect(bus.published.map((e) => e.eventName)).toEqual([
      'resource.published',
    ]);
  });

  it('refuses to publish an unverified resource', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const { id } = await new RegisterResource(repo, bus, activeReader).execute({
      emergencyId: EM,
      type: ResourceType.CollectionPoint,
      name: 'Punto',
      location: baseLocation,
      ownerUserId: 'user-publish-test-2',
    });
    await expect(
      new PublishResource(repo, bus).execute({ resourceId: id }),
    ).rejects.toBeInstanceOf(ResourceNotVerifiedError);
  });
});
