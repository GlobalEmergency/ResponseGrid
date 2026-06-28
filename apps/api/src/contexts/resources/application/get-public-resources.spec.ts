import { GetPublicResources } from './get-public-resources';
import { RegisterResource } from './register-resource';
import { VerifyResource } from './verify-resource';
import { PublishResource } from './publish-resource';
import { InMemoryResourceRepository } from '../infrastructure/in-memory-resource.repository';
import { FakeEventBus } from '../infrastructure/fake-event-bus';
import { Resource } from '../domain/resource';
import {
  ResourceType,
  ResourceStage,
  PublicStatus,
  VerificationLevel,
} from '../domain/resource-enums';
import { ResourceEmergencyStatusReader } from '../domain/ports/emergency-status-reader';

const EM = '11111111-1111-4111-8111-111111111111';
const baseLocation = {
  address: 'Plaza España, Sevilla',
  latitude: 37.3774,
  longitude: -5.9863,
};

const activeReader: ResourceEmergencyStatusReader = {
  getStatus: () => Promise.resolve('active'),
};

describe('GetPublicResources', () => {
  it('returns only published (active) resources of the emergency as paged views', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const register = new RegisterResource(repo, bus, activeReader);
    const verify = new VerifyResource(repo, bus);
    const publish = new PublishResource(repo, bus);

    const { id } = await register.execute({
      emergencyId: EM,
      type: ResourceType.Warehouse,
      stage: ResourceStage.Origin,
      name: 'Almacén Público',
      location: baseLocation,
      ownerUserId: 'user-public-test',
    });
    await verify.execute({
      resourceId: id,
      level: 'verified' as const,
      coordinatorId: 'c1',
    });
    await publish.execute({ resourceId: id });

    const result = await new GetPublicResources(repo).execute({
      emergencyId: EM,
    });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(50);
    expect(result.items[0]).toMatchObject({
      name: 'Almacén Público',
      publicStatus: PublicStatus.Active,
      stage: ResourceStage.Origin,
    });
    expect(result.items[0].location).toEqual(baseLocation);
  });

  it('does not return unverified or unpublished resources', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const register = new RegisterResource(repo, bus, activeReader);

    await register.execute({
      emergencyId: EM,
      type: ResourceType.CollectionPoint,
      stage: ResourceStage.Destination,
      name: 'Solo Registrado',
      location: baseLocation,
      ownerUserId: 'user-unverified-test',
    });

    const result = await new GetPublicResources(repo).execute({
      emergencyId: EM,
    });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('excludes active-but-unverified (ingested) points — #94', async () => {
    const repo = new InMemoryResourceRepository();

    // Active yet Unverified, as written by the external ingest path.
    await repo.save(
      Resource.fromSnapshot({
        id: '44444444-4444-4444-8444-444444444444',
        emergencyId: EM,
        type: ResourceType.CollectionPoint,
        stage: ResourceStage.Destination,
        name: 'Ingested Unverified',
        description: null,
        location: baseLocation,
        ownerUserId: 'ingest',
        ownerOrganizationId: null,
        verificationLevel: VerificationLevel.Unverified,
        publicStatus: PublicStatus.Active,
        createdAt: new Date('2026-06-01T00:00:00Z'),
        contact: null,
        schedule: null,
        manager: null,
        accepts: [],
        country: null,
        city: null,
        provenance: null,
        isFinalRecipient: false,
        recipientType: null,
        items: [],
      }),
    );

    const result = await new GetPublicResources(repo).execute({
      emergencyId: EM,
    });

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('respects page and limit query params', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const register = new RegisterResource(repo, bus, activeReader);
    const verify = new VerifyResource(repo, bus);
    const publish = new PublishResource(repo, bus);

    // Create 3 visible resources
    for (let i = 1; i <= 3; i++) {
      const { id } = await register.execute({
        emergencyId: EM,
        type: ResourceType.Warehouse,
        stage: ResourceStage.Origin,
        name: `Resource ${i}`,
        location: baseLocation,
        ownerUserId: `user-${i}`,
      });
      await verify.execute({
        resourceId: id,
        level: 'verified' as const,
        coordinatorId: 'c1',
      });
      await publish.execute({ resourceId: id });
    }

    const result = await new GetPublicResources(repo).execute({
      emergencyId: EM,
      page: 1,
      limit: 2,
    });

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(3);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(2);
  });

  it('execute with q="caritas" calls repo.findVisiblePaged with q and returns only matching resources', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const register = new RegisterResource(repo, bus, activeReader);
    const verify = new VerifyResource(repo, bus);
    const publish = new PublishResource(repo, bus);

    // Seed "Caritas" resource
    const { id: caritasId } = await register.execute({
      emergencyId: EM,
      type: ResourceType.Warehouse,
      stage: ResourceStage.Origin,
      name: 'Caritas',
      location: baseLocation,
      ownerUserId: 'user-caritas',
    });
    await verify.execute({
      resourceId: caritasId,
      level: 'verified' as const,
      coordinatorId: 'c1',
    });
    await publish.execute({ resourceId: caritasId });

    // Seed "Cruz Roja" resource
    const { id: cruzId } = await register.execute({
      emergencyId: EM,
      type: ResourceType.Warehouse,
      stage: ResourceStage.Origin,
      name: 'Cruz Roja',
      location: baseLocation,
      ownerUserId: 'user-cruz',
    });
    await verify.execute({
      resourceId: cruzId,
      level: 'verified' as const,
      coordinatorId: 'c1',
    });
    await publish.execute({ resourceId: cruzId });

    const result = await new GetPublicResources(repo).execute({
      emergencyId: EM,
      q: 'caritas',
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('Caritas');
    expect(result.total).toBe(1);
  });

  it('clamps limit to 100 max', async () => {
    const repo = new InMemoryResourceRepository();

    const result = await new GetPublicResources(repo).execute({
      emergencyId: EM,
      limit: 999,
    });

    expect(result.limit).toBe(100);
  });

  it('includes enriched fields in the view (accepts, contact, country, etc.)', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const register = new RegisterResource(repo, bus, activeReader);
    const verify = new VerifyResource(repo, bus);
    const publish = new PublishResource(repo, bus);

    const { id } = await register.execute({
      emergencyId: EM,
      type: ResourceType.CollectionPoint,
      stage: ResourceStage.Origin,
      name: 'Centro Acopio',
      location: baseLocation,
      ownerUserId: 'user-enriched',
      accepts: ['water', 'food'],
      contact: '+58 212 555 0000',
      schedule: 'Lun-Vie 08-18',
      manager: 'Juan Pérez',
      country: 'VE',
      city: 'Caracas',
    });
    await verify.execute({
      resourceId: id,
      level: 'verified' as const,
      coordinatorId: 'c1',
    });
    await publish.execute({ resourceId: id });

    const result = await new GetPublicResources(repo).execute({
      emergencyId: EM,
    });

    expect(result.items[0]).toMatchObject({
      accepts: ['water', 'food'],
      contact: '+58 212 555 0000',
      schedule: 'Lun-Vie 08-18',
      manager: 'Juan Pérez',
      country: 'VE',
      city: 'Caracas',
    });
  });
});
