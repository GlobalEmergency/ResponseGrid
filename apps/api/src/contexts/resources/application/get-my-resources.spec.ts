import { GetMyResources } from './get-my-resources';
import { RegisterResource } from './register-resource';
import { InMemoryResourceRepository } from '../infrastructure/in-memory-resource.repository';
import { FakeEventBus } from '../infrastructure/fake-event-bus';
import { ResourceType } from '../domain/resource-enums';
import { ResourceEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { PrincipalGrant } from './principal-grant';

const EM = '11111111-1111-4111-8111-111111111111';
const EM_2 = '22222222-2222-4222-8222-222222222222';
const OWNER_ID = 'owner-user-0000-0000-000000000000';
const MANAGER_ID = 'manager-user-0000-0000-000000000000';
const baseLocation = {
  address: 'Calle Test 1, Madrid',
  latitude: 40.4168,
  longitude: -3.7038,
};

const activeReader: ResourceEmergencyStatusReader = {
  getStatus: () => Promise.resolve('active'),
};

const NOW = new Date('2026-07-02T12:00:00Z');

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
  q: { name: string; ownerUserId: string; emergencyId?: string },
): Promise<string> {
  const { id } = await new RegisterResource(repo, bus, activeReader).execute({
    emergencyId: q.emergencyId ?? EM,
    type: ResourceType.CollectionPoint,
    name: q.name,
    location: baseLocation,
    ownerUserId: q.ownerUserId,
  });
  return id;
}

describe('GetMyResources', () => {
  it('returns the resources the user owns in the emergency', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    await makeResource(repo, bus, { name: 'Propio A', ownerUserId: OWNER_ID });
    await makeResource(repo, bus, {
      name: 'Ajeno',
      ownerUserId: 'someone-else',
    });

    const views = await new GetMyResources(repo).execute({
      emergencyId: EM,
      userId: OWNER_ID,
    });

    expect(views.map((v) => v.name)).toEqual(['Propio A']);
  });

  it('includes a resource reached only through an entity-scoped grant (#323)', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makeResource(repo, bus, {
      name: 'Gestionado',
      ownerUserId: OWNER_ID,
    });

    const views = await new GetMyResources(repo).execute({
      emergencyId: EM,
      userId: MANAGER_ID,
      grants: [entityGrant(id)],
      now: NOW,
    });

    expect(views.map((v) => v.name)).toEqual(['Gestionado']);
  });

  it('excludes a granted resource that belongs to another emergency', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const otherEmId = await makeResource(repo, bus, {
      name: 'En otra emergencia',
      ownerUserId: OWNER_ID,
      emergencyId: EM_2,
    });

    const views = await new GetMyResources(repo).execute({
      emergencyId: EM,
      userId: MANAGER_ID,
      grants: [entityGrant(otherEmId)],
      now: NOW,
    });

    expect(views).toEqual([]);
  });

  it('does not duplicate a resource that is both owned and granted', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makeResource(repo, bus, {
      name: 'Propio y gestionado',
      ownerUserId: OWNER_ID,
    });

    const views = await new GetMyResources(repo).execute({
      emergencyId: EM,
      userId: OWNER_ID,
      grants: [entityGrant(id)],
      now: NOW,
    });

    expect(views).toHaveLength(1);
    expect(views[0].name).toBe('Propio y gestionado');
  });

  it('ignores expired grants', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makeResource(repo, bus, {
      name: 'Caducado',
      ownerUserId: OWNER_ID,
    });

    const views = await new GetMyResources(repo).execute({
      emergencyId: EM,
      userId: MANAGER_ID,
      grants: [entityGrant(id, { expiresAt: '2026-07-01T00:00:00Z' })],
      now: NOW,
    });

    expect(views).toEqual([]);
  });
});
