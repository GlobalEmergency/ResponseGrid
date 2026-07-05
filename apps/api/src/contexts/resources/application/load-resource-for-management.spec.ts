import { loadResourceForManagement } from './load-resource-for-management';
import { RegisterResource } from './register-resource';
import { InMemoryResourceRepository } from '../infrastructure/in-memory-resource.repository';
import { FakeEventBus } from '../infrastructure/fake-event-bus';
import { ResourceType } from '../domain/resource-enums';
import { ResourceEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { ResourceMembershipReader } from '../domain/ports/membership-reader';
import { ResourceNotFoundError } from './resource-not-found.error';
import { PrincipalGrant } from './principal-grant';

const EM = '11111111-1111-4111-8111-111111111111';
const OWNER_ID = 'owner-user-0000-0000-000000000000';
const COORD_ID = 'coord-user-0000-0000-000000000000';
const MANAGER_ID = 'manager-user-0000-0000-000000000000';
const THIRD_ID = 'third-user-0000-0000-000000000000';
const OTHER_RESOURCE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const baseLocation = {
  address: 'Calle Test 1, Madrid',
  latitude: 40.4168,
  longitude: -3.7038,
};

const activeReader: ResourceEmergencyStatusReader = {
  getStatus: () => Promise.resolve('active'),
};

class Forbidden extends Error {}
const makeForbidden = (): Error => new Forbidden();

/** Membership reader that records whether it was consulted. */
function trackingReader(isCoord: boolean): {
  reader: ResourceMembershipReader;
  queried: () => boolean;
} {
  let queried = false;
  return {
    reader: {
      isCoordinator: (userId) => {
        queried = true;
        return Promise.resolve(isCoord && userId === COORD_ID);
      },
    },
    queried: () => queried,
  };
}

function entityGrant(
  resourceId: string,
  overrides: Partial<PrincipalGrant> = {},
): PrincipalGrant {
  return {
    roleId: 'point_manager',
    scope: { type: 'entity', entityType: 'resource', id: resourceId },
    expiresAt: null,
    ...overrides,
  };
}

async function makeResource(
  repo: InMemoryResourceRepository,
  bus: FakeEventBus,
): Promise<string> {
  const { id } = await new RegisterResource(repo, bus, activeReader).execute({
    emergencyId: EM,
    type: ResourceType.CollectionPoint,
    name: 'Punto Test',
    location: baseLocation,
    ownerUserId: OWNER_ID,
  });
  return id;
}

describe('loadResourceForManagement', () => {
  it('owner is authorized without consulting membership', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makeResource(repo, bus);
    const { reader, queried } = trackingReader(false);

    const resource = await loadResourceForManagement({
      repo,
      membershipReader: reader,
      resourceId: id,
      requesterUserId: OWNER_ID,
      makeForbidden,
    });

    expect(resource.id.value).toBe(id);
    expect(queried()).toBe(false);
  });

  it('an active entity-scoped grant on the resource authorizes without consulting membership (#316)', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makeResource(repo, bus);
    const { reader, queried } = trackingReader(false);

    const resource = await loadResourceForManagement({
      repo,
      membershipReader: reader,
      resourceId: id,
      requesterUserId: MANAGER_ID,
      grants: [entityGrant(id)],
      makeForbidden,
    });

    expect(resource.id.value).toBe(id);
    expect(queried()).toBe(false);
  });

  it('an expired entity grant does not authorize', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makeResource(repo, bus);
    const { reader } = trackingReader(false);

    await expect(
      loadResourceForManagement({
        repo,
        membershipReader: reader,
        resourceId: id,
        requesterUserId: MANAGER_ID,
        grants: [entityGrant(id, { expiresAt: '2026-07-01T00:00:00Z' })],
        now: new Date('2026-07-02T12:00:00Z'),
        makeForbidden,
      }),
    ).rejects.toBeInstanceOf(Forbidden);
  });

  it('an entity grant on a different resource does not authorize', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makeResource(repo, bus);
    const { reader } = trackingReader(false);

    await expect(
      loadResourceForManagement({
        repo,
        membershipReader: reader,
        resourceId: id,
        requesterUserId: MANAGER_ID,
        grants: [entityGrant(OTHER_RESOURCE)],
        makeForbidden,
      }),
    ).rejects.toBeInstanceOf(Forbidden);
  });

  it('a coordinator with no grant is authorized (falls through to membership)', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makeResource(repo, bus);
    const { reader, queried } = trackingReader(true);

    const resource = await loadResourceForManagement({
      repo,
      membershipReader: reader,
      resourceId: id,
      requesterUserId: COORD_ID,
      makeForbidden,
    });

    expect(resource.id.value).toBe(id);
    expect(queried()).toBe(true);
  });

  it('a third party with no owner/grant/coordinator is rejected', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makeResource(repo, bus);
    const { reader } = trackingReader(false);

    await expect(
      loadResourceForManagement({
        repo,
        membershipReader: reader,
        resourceId: id,
        requesterUserId: THIRD_ID,
        grants: [],
        makeForbidden,
      }),
    ).rejects.toBeInstanceOf(Forbidden);
  });

  it('an unknown resource id maps to ResourceNotFoundError before any authz check', async () => {
    const repo = new InMemoryResourceRepository();
    const { reader } = trackingReader(false);

    await expect(
      loadResourceForManagement({
        repo,
        membershipReader: reader,
        resourceId: '99999999-9999-4999-8999-999999999999',
        requesterUserId: OWNER_ID,
        makeForbidden,
      }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
  });
});
