import { ListResourcesAdmin } from './list-resources-admin';
import {
  ResourceRepository,
  ResourceWithEmergency,
} from '../domain/ports/resource.repository';
import { Resource } from '../domain/resource';
import { ResourceId } from '../domain/resource-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { Location } from '../../../shared/domain/location';
import {
  ResourceType,
  ResourceStage,
  PublicStatus,
  VerificationLevel,
} from '../domain/resource-enums';

const EM = '11111111-1111-4111-8111-111111111111';

function makeResource(name: string): Resource {
  return Resource.register({
    id: ResourceId.create(),
    emergencyId: EmergencyId.fromString(EM),
    type: ResourceType.Warehouse,
    stage: ResourceStage.Origin,
    name,
    location: Location.create({
      address: 'Calle 1',
      latitude: 10,
      longitude: -66,
    }),
    ownerUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  });
}

/** Minimal repo double recording the args passed to findAllPaged. */
function repoReturning(
  items: ResourceWithEmergency[],
  total = items.length,
): {
  repo: ResourceRepository;
  calls: Parameters<ResourceRepository['findAllPaged']>[0][];
} {
  const calls: Parameters<ResourceRepository['findAllPaged']>[0][] = [];
  const repo = {
    findAllPaged: (q: Parameters<ResourceRepository['findAllPaged']>[0]) => {
      calls.push(q);
      return Promise.resolve({ items, total });
    },
  } as unknown as ResourceRepository;
  return { repo, calls };
}

describe('ListResourcesAdmin', () => {
  it('maps rows to the admin view, carrying emergency id + name', async () => {
    const r = makeResource('Almacén Sur');
    const { repo } = repoReturning([
      { resource: r, emergencyName: 'Terremoto' },
    ]);

    const result = await new ListResourcesAdmin(repo).execute({});

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: r.id.value,
      name: 'Almacén Sur',
      emergencyId: EM,
      emergencyName: 'Terremoto',
      // base view fields are preserved
      publicStatus: PublicStatus.Hidden,
      verificationLevel: VerificationLevel.Unverified,
    });
  });

  it('defaults to page 1 / limit 50 and omits absent filters', async () => {
    const { repo, calls } = repoReturning([]);

    await new ListResourcesAdmin(repo).execute({});

    expect(calls[0]).toEqual({ page: 1, limit: 50 });
  });

  it('caps the limit at 100', async () => {
    const { repo, calls } = repoReturning([]);

    await new ListResourcesAdmin(repo).execute({ limit: 500 });

    expect(calls[0]?.limit).toBe(100);
  });

  it('forwards all filters, converting emergencyId to an EmergencyId', async () => {
    const { repo, calls } = repoReturning([]);

    await new ListResourcesAdmin(repo).execute({
      page: 2,
      limit: 25,
      emergencyId: EM,
      type: ResourceType.DeliveryPoint,
      status: PublicStatus.Closed,
      verification: VerificationLevel.Official,
      q: 'cruz',
    });

    expect(calls[0]).toMatchObject({
      page: 2,
      limit: 25,
      type: ResourceType.DeliveryPoint,
      status: PublicStatus.Closed,
      verification: VerificationLevel.Official,
      q: 'cruz',
    });
    expect(calls[0]?.emergencyId).toBeInstanceOf(EmergencyId);
    expect(calls[0]?.emergencyId?.value).toBe(EM);
  });

  it('drops an empty search string (treated as no filter)', async () => {
    const { repo, calls } = repoReturning([]);

    await new ListResourcesAdmin(repo).execute({ q: '' });

    expect(calls[0]).toEqual({ page: 1, limit: 50 });
    expect('q' in calls[0]).toBe(false);
  });
});
