import { GetMyInventory } from './get-my-inventory';
import { RegisterResource } from './register-resource';
import { InMemoryResourceRepository } from '../infrastructure/in-memory-resource.repository';
import { FakeEventBus } from '../infrastructure/fake-event-bus';
import { ResourceType } from '../domain/resource-enums';
import { ResourceEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { ResourceMembershipReader } from '../domain/ports/membership-reader';
import {
  Category,
  SupplyLineProps,
} from '@globalemergency/warehouse-core/kernel';
import { ResourceNotFoundError } from './resource-not-found.error';
import { UnauthorizedInventoryChangeError } from './unauthorized-inventory-change.error';

const EM = '11111111-1111-4111-8111-111111111111';
const OWNER_ID = 'owner-user-0000-0000-000000000000';
const COORD_ID = 'coord-user-0000-0000-000000000000';
const THIRD_ID = 'third-user-0000-0000-000000000000';
const MANAGER_ID = 'manager-user-0000-0000-000000000000';
const baseLocation = {
  address: 'Calle Test 1, Madrid',
  latitude: 40.4168,
  longitude: -3.7038,
};

const activeReader: ResourceEmergencyStatusReader = {
  getStatus: () => Promise.resolve('active'),
};
const coordOnlyMembership: ResourceMembershipReader = {
  isCoordinator: (userId) => Promise.resolve(userId === COORD_ID),
};
const noMembership: ResourceMembershipReader = {
  isCoordinator: () => Promise.resolve(false),
};

const line: SupplyLineProps = {
  name: 'Agua',
  quantity: 10,
  unit: 'l',
  category: Category.Water,
};

async function makeResource(
  repo: InMemoryResourceRepository,
  bus: FakeEventBus,
): Promise<string> {
  const { id } = await new RegisterResource(repo, bus, activeReader).execute({
    emergencyId: EM,
    type: ResourceType.Warehouse,
    name: 'Punto Test',
    location: baseLocation,
    ownerUserId: OWNER_ID,
    items: [line],
  });
  return id;
}

describe('GetMyInventory', () => {
  it('owner reads the full declared lines', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makeResource(repo, bus);

    const lines = await new GetMyInventory(repo, noMembership).execute({
      resourceId: id,
      requesterUserId: OWNER_ID,
    });

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ name: 'Agua', quantity: 10, unit: 'l' });
  });

  it('coordinator (not owner) can read', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makeResource(repo, bus);

    const lines = await new GetMyInventory(repo, coordOnlyMembership).execute({
      resourceId: id,
      requesterUserId: COORD_ID,
    });

    expect(lines).toHaveLength(1);
  });

  it('point manager (entity-scoped grant, not owner/coordinator) can read (#316)', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makeResource(repo, bus);

    const lines = await new GetMyInventory(repo, noMembership).execute({
      resourceId: id,
      requesterUserId: MANAGER_ID,
      grants: [
        {
          roleId: 'point_manager',
          scope: { type: 'entity', entityType: 'resource', id },
          expiresAt: null,
        },
      ],
    });

    expect(lines).toHaveLength(1);
  });

  it('third party → UnauthorizedInventoryChangeError', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makeResource(repo, bus);

    await expect(
      new GetMyInventory(repo, noMembership).execute({
        resourceId: id,
        requesterUserId: THIRD_ID,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedInventoryChangeError);
  });

  it('unknown resourceId → ResourceNotFoundError', async () => {
    const repo = new InMemoryResourceRepository();

    await expect(
      new GetMyInventory(repo, noMembership).execute({
        resourceId: '99999999-9999-4999-8999-999999999999',
        requesterUserId: OWNER_ID,
      }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
  });
});
