import { GetCoordinationQueue } from './get-coordination-queue';
import { RegisterResource } from './register-resource';
import { InMemoryResourceRepository } from '../infrastructure/in-memory-resource.repository';
import { FakeEventBus } from '../infrastructure/fake-event-bus';
import { ResourceType } from '../domain/resource-enums';
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

function makeRegister(repo: InMemoryResourceRepository): RegisterResource {
  return new RegisterResource(repo, new FakeEventBus(), activeReader);
}

describe('GetCoordinationQueue', () => {
  it('returns pending resources of the emergency as a paged result', async () => {
    const repo = new InMemoryResourceRepository();
    await makeRegister(repo).execute({
      emergencyId: EM,
      type: ResourceType.CollectionPoint,
      name: 'Punto 1',
      location: baseLocation,
      ownerUserId: 'user-coord-test',
    });

    const result = await new GetCoordinationQueue(repo).execute({
      emergencyId: EM,
    });

    expect(result).toEqual({
      items: [
        expect.objectContaining({
          name: 'Punto 1',
          verificationLevel: 'unverified',
          publicStatus: 'hidden',
        }),
      ],
      total: 1,
      page: 1,
      limit: 50,
    });
  });

  it('paginates the queue and reports the full total', async () => {
    const repo = new InMemoryResourceRepository();
    const register = makeRegister(repo);
    for (let i = 0; i < 5; i++) {
      await register.execute({
        emergencyId: EM,
        type: ResourceType.CollectionPoint,
        name: `Punto ${i}`,
        location: baseLocation,
        ownerUserId: `user-${i}`,
      });
    }

    const page2 = await new GetCoordinationQueue(repo).execute({
      emergencyId: EM,
      page: 2,
      limit: 2,
    });

    expect(page2.total).toBe(5);
    expect(page2.page).toBe(2);
    expect(page2.limit).toBe(2);
    expect(page2.items).toHaveLength(2);
  });

  it('filters by free-text search over name/address/city', async () => {
    const repo = new InMemoryResourceRepository();
    const register = makeRegister(repo);
    await register.execute({
      emergencyId: EM,
      type: ResourceType.CollectionPoint,
      name: 'Cruz Roja Valencia',
      location: baseLocation,
      ownerUserId: 'user-a',
    });
    await register.execute({
      emergencyId: EM,
      type: ResourceType.CollectionPoint,
      name: 'Cáritas Madrid',
      location: baseLocation,
      ownerUserId: 'user-b',
    });

    const result = await new GetCoordinationQueue(repo).execute({
      emergencyId: EM,
      q: 'cruz',
    });

    expect(result.total).toBe(1);
    expect(result.items[0]?.name).toBe('Cruz Roja Valencia');
  });

  it('filters by resource type', async () => {
    const repo = new InMemoryResourceRepository();
    const register = makeRegister(repo);
    await register.execute({
      emergencyId: EM,
      type: ResourceType.CollectionPoint,
      name: 'Acopio',
      location: baseLocation,
      ownerUserId: 'user-a',
    });
    await register.execute({
      emergencyId: EM,
      type: ResourceType.Warehouse,
      name: 'Almacén central',
      location: baseLocation,
      ownerUserId: 'user-b',
    });

    const result = await new GetCoordinationQueue(repo).execute({
      emergencyId: EM,
      type: ResourceType.Warehouse,
    });

    expect(result.total).toBe(1);
    expect(result.items[0]?.name).toBe('Almacén central');
  });
});
