import { GetCoordinationQueue } from './get-coordination-queue';
import { RegisterResource } from './register-resource';
import { InMemoryResourceRepository } from '../infrastructure/in-memory-resource.repository';
import { FakeEventBus } from '../infrastructure/fake-event-bus';
import { ResourceType, ResourceStage } from '../domain/resource-enums';
import { ResourceEmergencyStatusReader } from '../domain/ports/emergency-status-reader';

const EM = '11111111-1111-4111-8111-111111111111';
const baseLocation = {
  address: 'Calle Mayor 1, Valencia',
  latitude: 39.4699,
  longitude: -0.3763,
};

const activeReader: ResourceEmergencyStatusReader = {
  getStatus: () => Promise.resolve('active'),
};

describe('GetCoordinationQueue', () => {
  it('returns pending resources of the emergency as views', async () => {
    const repo = new InMemoryResourceRepository();
    const register = new RegisterResource(
      repo,
      new FakeEventBus(),
      activeReader,
    );
    await register.execute({
      emergencyId: EM,
      type: ResourceType.CollectionPoint,
      stage: ResourceStage.Origin,
      name: 'Punto 1',
      location: baseLocation,
      ownerUserId: 'user-coord-test',
    });

    const views = await new GetCoordinationQueue(repo).execute({
      emergencyId: EM,
    });

    expect(views).toEqual([
      expect.objectContaining({
        name: 'Punto 1',
        stage: ResourceStage.Origin,
        verificationLevel: 'unverified',
        publicStatus: 'hidden',
      }),
    ]);
  });
});
