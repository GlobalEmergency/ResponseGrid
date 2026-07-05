import {
  GetMyManagedResources,
  PrincipalGrant,
} from './get-my-managed-resources';
import { RegisterResource } from './register-resource';
import { InMemoryResourceRepository } from '../infrastructure/in-memory-resource.repository';
import { FakeEventBus } from '../infrastructure/fake-event-bus';
import { ResourceType } from '../domain/resource-enums';
import { ResourceEmergencyStatusReader } from '../domain/ports/emergency-status-reader';

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

describe('GetMyManagedResources', () => {
  it('returns the resources the principal owns, across emergencies', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    await makeResource(repo, bus, { name: 'Acopio A', ownerUserId: OWNER_ID });
    await makeResource(repo, bus, {
      name: 'Acopio B',
      ownerUserId: OWNER_ID,
      emergencyId: EM_2,
    });
    await makeResource(repo, bus, { name: 'Ajeno', ownerUserId: 'other' });

    const views = await new GetMyManagedResources(repo).execute(
      OWNER_ID,
      [],
      NOW,
    );

    expect(views.map((v) => v.name).sort()).toEqual(['Acopio A', 'Acopio B']);
    expect(views.map((v) => v.emergencyId).sort()).toEqual([EM, EM_2]);
  });

  it('returns resources reached only through an entity-scoped grant (issue #285)', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makeResource(repo, bus, {
      name: 'Acopio gestionado',
      ownerUserId: OWNER_ID,
    });

    const views = await new GetMyManagedResources(repo).execute(
      MANAGER_ID,
      [entityGrant(id)],
      NOW,
    );

    expect(views).toEqual([
      {
        id,
        type: ResourceType.CollectionPoint,
        name: 'Acopio gestionado',
        emergencyId: EM,
        emergencySlug: null,
      },
    ]);
  });

  it('does not duplicate a resource that is both owned and granted', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makeResource(repo, bus, {
      name: 'Acopio propio',
      ownerUserId: OWNER_ID,
    });

    const views = await new GetMyManagedResources(repo).execute(
      OWNER_ID,
      [entityGrant(id)],
      NOW,
    );

    expect(views).toHaveLength(1);
  });

  it('ignores expired grants', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makeResource(repo, bus, {
      name: 'Acopio caducado',
      ownerUserId: OWNER_ID,
    });

    const views = await new GetMyManagedResources(repo).execute(
      MANAGER_ID,
      [entityGrant(id, { expiresAt: '2026-07-01T00:00:00Z' })],
      NOW,
    );

    expect(views).toEqual([]);
  });

  it('ignores grants that are not entity-scoped to a resource', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makeResource(repo, bus, {
      name: 'Acopio',
      ownerUserId: OWNER_ID,
    });

    const views = await new GetMyManagedResources(repo).execute(MANAGER_ID, [
      {
        roleId: 'coordinator',
        scope: { type: 'emergency', id: EM },
        expiresAt: null,
      },
      {
        roleId: 'group_manager',
        scope: { type: 'entity', entityType: 'group', id },
        expiresAt: null,
      },
      {
        roleId: 'point_manager',
        scope: { type: 'entity', entityType: 'resource' },
        expiresAt: null,
      },
    ]);

    expect(views).toEqual([]);
  });

  it('returns an empty list for a principal with nothing to manage', async () => {
    const repo = new InMemoryResourceRepository();
    const views = await new GetMyManagedResources(repo).execute(
      MANAGER_ID,
      [],
      NOW,
    );
    expect(views).toEqual([]);
  });
});
