import { UpdateMyInventory } from './update-my-inventory';
import { RegisterResource } from './register-resource';
import { InMemoryResourceRepository } from '../infrastructure/in-memory-resource.repository';
import { FakeEventBus } from '../infrastructure/fake-event-bus';
import { ResourceId } from '../domain/resource-id';
import { ResourceType } from '../domain/resource-enums';
import { ResourceEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { ResourceMembershipReader } from '../domain/ports/membership-reader';
import {
  Category,
  SupplyLineProps,
  SupplyLineValidationError,
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

const line = (name: string, quantity: number): SupplyLineProps => ({
  name,
  quantity,
  unit: 'l',
  category: Category.Water,
});

async function makeResource(
  repo: InMemoryResourceRepository,
  bus: FakeEventBus,
  items: SupplyLineProps[] = [],
): Promise<string> {
  const { id } = await new RegisterResource(repo, bus, activeReader).execute({
    emergencyId: EM,
    type: ResourceType.Warehouse,
    name: 'Punto Test',
    location: baseLocation,
    ownerUserId: OWNER_ID,
    items,
  });
  return id;
}

describe('UpdateMyInventory', () => {
  it('owner replaces the whole inventory', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makeResource(repo, bus, [line('Agua', 10)]);

    await new UpdateMyInventory(repo, noMembership).execute({
      resourceId: id,
      requesterUserId: OWNER_ID,
      lines: [line('Arroz', 3)],
    });

    const found = await repo.findById(ResourceId.fromString(id));
    expect(found?.items.map((i) => i.name)).toEqual(['Arroz']);
  });

  it('coordinator (not owner) can replace inventory', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makeResource(repo, bus, [line('Agua', 10)]);

    await new UpdateMyInventory(repo, coordOnlyMembership).execute({
      resourceId: id,
      requesterUserId: COORD_ID,
      lines: [line('Mantas', 5)],
    });

    const found = await repo.findById(ResourceId.fromString(id));
    expect(found?.items.map((i) => i.name)).toEqual(['Mantas']);
  });

  it('point manager (entity-scoped grant, not owner/coordinator) can replace inventory (#316)', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makeResource(repo, bus, [line('Agua', 10)]);

    await new UpdateMyInventory(repo, noMembership).execute({
      resourceId: id,
      requesterUserId: MANAGER_ID,
      lines: [line('Kits', 7)],
      grants: [
        {
          roleId: 'point_manager',
          scope: { type: 'entity', entityType: 'resource', id },
          expiresAt: null,
        },
      ],
    });

    const found = await repo.findById(ResourceId.fromString(id));
    expect(found?.items.map((i) => i.name)).toEqual(['Kits']);
  });

  it('owner path does not query coordinator membership', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makeResource(repo, bus, [line('Agua', 10)]);

    let membershipQueried = false;
    const tracking: ResourceMembershipReader = {
      isCoordinator: () => {
        membershipQueried = true;
        return Promise.resolve(false);
      },
    };

    await new UpdateMyInventory(repo, tracking).execute({
      resourceId: id,
      requesterUserId: OWNER_ID,
      lines: [line('Arroz', 3)],
    });

    expect(membershipQueried).toBe(false);
  });

  it('empty list clears inventory', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makeResource(repo, bus, [line('Agua', 10)]);

    await new UpdateMyInventory(repo, noMembership).execute({
      resourceId: id,
      requesterUserId: OWNER_ID,
      lines: [],
    });

    const found = await repo.findById(ResourceId.fromString(id));
    expect(found?.items).toHaveLength(0);
  });

  it('third party (not owner, not coordinator) → UnauthorizedInventoryChangeError', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makeResource(repo, bus);

    await expect(
      new UpdateMyInventory(repo, noMembership).execute({
        resourceId: id,
        requesterUserId: THIRD_ID,
        lines: [line('Agua', 1)],
      }),
    ).rejects.toBeInstanceOf(UnauthorizedInventoryChangeError);
  });

  it('unknown resourceId → ResourceNotFoundError', async () => {
    const repo = new InMemoryResourceRepository();

    await expect(
      new UpdateMyInventory(repo, noMembership).execute({
        resourceId: '99999999-9999-4999-8999-999999999999',
        requesterUserId: OWNER_ID,
        lines: [],
      }),
    ).rejects.toBeInstanceOf(ResourceNotFoundError);
  });

  it('invalid line (quantity 0) → SupplyLineValidationError', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makeResource(repo, bus);

    await expect(
      new UpdateMyInventory(repo, noMembership).execute({
        resourceId: id,
        requesterUserId: OWNER_ID,
        lines: [{ ...line('Agua', 0) }],
      }),
    ).rejects.toBeInstanceOf(SupplyLineValidationError);
  });
});
