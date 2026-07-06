import { UpdateMyInventory } from './update-my-inventory';
import { RegisterResource } from './register-resource';
import { InMemoryResourceRepository } from '../infrastructure/in-memory-resource.repository';
import { FakeEventBus } from '../infrastructure/fake-event-bus';
import { ResourceId } from '../domain/resource-id';
import { ResourceType } from '../domain/resource-enums';
import { ResourceEmergencyStatusReader } from '../domain/ports/emergency-status-reader';
import { ResourceMembershipReader } from '../domain/ports/membership-reader';
import { Category } from '../../supplies/domain/category';
import {
  SupplyLine,
  SupplyLineProps,
  SupplyLineValidationError,
} from '../../supplies/domain/supply-line';
import { ResourceNotFoundError } from './resource-not-found.error';
import { UnauthorizedInventoryChangeError } from './unauthorized-inventory-change.error';
import { InventoryVersionConflictError } from './inventory-version-conflict.error';

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
      expectedVersion: 0,
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
      expectedVersion: 0,
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
      expectedVersion: 0,
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
      expectedVersion: 0,
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
      expectedVersion: 0,
    });

    const found = await repo.findById(ResourceId.fromString(id));
    expect(found?.items).toHaveLength(0);
  });

  it('a successful replace advances inventoryVersion, so a stale caller is rejected next time (#294)', async () => {
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makeResource(repo, bus, [line('Agua', 10)]);

    await new UpdateMyInventory(repo, noMembership).execute({
      resourceId: id,
      requesterUserId: OWNER_ID,
      lines: [line('Arroz', 3)],
      expectedVersion: 0,
    });

    const found = await repo.findById(ResourceId.fromString(id));
    expect(found?.inventoryVersion).toBe(1);

    // Retrying with the now-stale version (0) must fail, not overwrite again.
    await expect(
      new UpdateMyInventory(repo, noMembership).execute({
        resourceId: id,
        requesterUserId: OWNER_ID,
        lines: [line('Mantas', 1)],
        expectedVersion: 0,
      }),
    ).rejects.toBeInstanceOf(InventoryVersionConflictError);
  });

  it('#294: a concurrent merge (receiveInventory) between the form load and the save is NOT silently discarded', async () => {
    // Reproduces the reported lost-update scenario: the owner opens the
    // inventory edit form (reads version 0, seeded with line A); while the
    // form is open, an operator/worker merges in line B via
    // POST /resources/:id/inventory-entries (Resource.receiveInventory),
    // bumping the version to 1. The owner then saves the form unchanged
    // (still carrying expectedVersion 0) — the PUT must reject the stale
    // write with a conflict instead of overwriting B away.
    const repo = new InMemoryResourceRepository();
    const bus = new FakeEventBus();
    const id = await makeResource(repo, bus, [line('Agua', 10)]);
    const loadedVersion = 0;

    // Concurrent merge lands first (operator records a manual entry).
    const resource = await repo.findById(ResourceId.fromString(id));
    resource!.receiveInventory([SupplyLine.create(line('Mantas', 5))]);
    await repo.save(resource!);

    const beforeOverwrite = await repo.findById(ResourceId.fromString(id));
    expect(beforeOverwrite?.items.map((i) => i.name).sort()).toEqual([
      'Agua',
      'Mantas',
    ]);

    // Owner's stale form save (still thinks the version is 0) must be rejected.
    await expect(
      new UpdateMyInventory(repo, noMembership).execute({
        resourceId: id,
        requesterUserId: OWNER_ID,
        lines: [line('Agua', 10)],
        expectedVersion: loadedVersion,
      }),
    ).rejects.toBeInstanceOf(InventoryVersionConflictError);

    // Mantas must still be there — the concurrent merge was NOT lost.
    const after = await repo.findById(ResourceId.fromString(id));
    expect(after?.items.map((i) => i.name).sort()).toEqual(['Agua', 'Mantas']);
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
        expectedVersion: 0,
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
        expectedVersion: 0,
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
        expectedVersion: 0,
      }),
    ).rejects.toBeInstanceOf(SupplyLineValidationError);
  });
});
