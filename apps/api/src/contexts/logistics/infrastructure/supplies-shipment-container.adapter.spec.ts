import { SuppliesShipmentContainerAdapter } from './supplies-shipment-container.adapter';
import { InMemoryContainerRepository } from '../../supplies/infrastructure/in-memory-container.repository';
import { Container, ContainerHolder } from '../../supplies/domain/container';
import { ContainerId } from '../../supplies/domain/container-id';
import {
  ContainerHolderType,
  ContainerType,
} from '../../supplies/domain/container-enums';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import {
  ShipmentContainerNotFoundError,
  ShipmentContainerUnavailableError,
} from '../application/shipment-cargo-errors';

const EM = '11111111-1111-4111-8111-111111111111';
const OTHER_EM = '55555555-5555-4555-8555-555555555555';
const SHIP = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const OTHER_SHIP = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const ORIGIN = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const DEST = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const UNKNOWN = '99999999-9999-4999-8999-999999999999';

async function seedContainer(
  repo: InMemoryContainerRepository,
  opts?: { emergencyId?: string; holder?: ContainerHolder | null },
): Promise<string> {
  const id = ContainerId.create();
  await repo.save(
    Container.create({
      id,
      code: 'PAL-0001',
      type: ContainerType.Pallet,
      emergencyId: EmergencyId.fromString(opts?.emergencyId ?? EM),
      holder: opts?.holder ?? {
        type: ContainerHolderType.Resource,
        id: ORIGIN,
      },
    }),
  );
  return id.value;
}

async function holderOf(
  repo: InMemoryContainerRepository,
  id: string,
): Promise<ContainerHolder | null> {
  const c = await repo.findById(ContainerId.fromString(id));
  return c!.holder;
}

describe('SuppliesShipmentContainerAdapter', () => {
  it('loads a container onto the shipment (holder = shipment)', async () => {
    const repo = new InMemoryContainerRepository();
    const adapter = new SuppliesShipmentContainerAdapter(repo);
    const id = await seedContainer(repo);

    await adapter.loadOntoShipment({
      emergencyId: EM,
      shipmentId: SHIP,
      containerIds: [id],
    });

    expect(await holderOf(repo, id)).toEqual({
      type: ContainerHolderType.Shipment,
      id: SHIP,
    });
  });

  it('moves containers to a resource (holder = resource)', async () => {
    const repo = new InMemoryContainerRepository();
    const adapter = new SuppliesShipmentContainerAdapter(repo);
    const id = await seedContainer(repo, {
      holder: { type: ContainerHolderType.Shipment, id: SHIP },
    });

    await adapter.moveContainersToResource({
      emergencyId: EM,
      containerIds: [id],
      resourceId: DEST,
    });

    expect(await holderOf(repo, id)).toEqual({
      type: ContainerHolderType.Resource,
      id: DEST,
    });
  });

  it('rejects loading an unknown container', async () => {
    const repo = new InMemoryContainerRepository();
    const adapter = new SuppliesShipmentContainerAdapter(repo);

    await expect(
      adapter.loadOntoShipment({
        emergencyId: EM,
        shipmentId: SHIP,
        containerIds: [UNKNOWN],
      }),
    ).rejects.toThrow(ShipmentContainerNotFoundError);
  });

  it('rejects loading a container from another emergency', async () => {
    const repo = new InMemoryContainerRepository();
    const adapter = new SuppliesShipmentContainerAdapter(repo);
    const id = await seedContainer(repo, { emergencyId: OTHER_EM });

    await expect(
      adapter.loadOntoShipment({
        emergencyId: EM,
        shipmentId: SHIP,
        containerIds: [id],
      }),
    ).rejects.toThrow(ShipmentContainerNotFoundError);
  });

  it('rejects loading a container already on another shipment', async () => {
    const repo = new InMemoryContainerRepository();
    const adapter = new SuppliesShipmentContainerAdapter(repo);
    const id = await seedContainer(repo, {
      holder: { type: ContainerHolderType.Shipment, id: OTHER_SHIP },
    });

    await expect(
      adapter.loadOntoShipment({
        emergencyId: EM,
        shipmentId: SHIP,
        containerIds: [id],
      }),
    ).rejects.toThrow(ShipmentContainerUnavailableError);
  });

  it('is all-or-nothing: a bad id leaves the good container untouched', async () => {
    const repo = new InMemoryContainerRepository();
    const adapter = new SuppliesShipmentContainerAdapter(repo);
    const good = await seedContainer(repo);

    await expect(
      adapter.loadOntoShipment({
        emergencyId: EM,
        shipmentId: SHIP,
        containerIds: [good, UNKNOWN],
      }),
    ).rejects.toThrow(ShipmentContainerNotFoundError);

    // the good container was never moved (validation runs before any mutation)
    expect(await holderOf(repo, good)).toEqual({
      type: ContainerHolderType.Resource,
      id: ORIGIN,
    });
  });

  it('allows re-loading a container already on this same shipment (idempotent)', async () => {
    const repo = new InMemoryContainerRepository();
    const adapter = new SuppliesShipmentContainerAdapter(repo);
    const id = await seedContainer(repo, {
      holder: { type: ContainerHolderType.Shipment, id: SHIP },
    });

    await expect(
      adapter.loadOntoShipment({
        emergencyId: EM,
        shipmentId: SHIP,
        containerIds: [id],
      }),
    ).resolves.toBeUndefined();
    expect(await holderOf(repo, id)).toEqual({
      type: ContainerHolderType.Shipment,
      id: SHIP,
    });
  });

  it('rejects moving an unknown container to a resource', async () => {
    const repo = new InMemoryContainerRepository();
    const adapter = new SuppliesShipmentContainerAdapter(repo);

    await expect(
      adapter.moveContainersToResource({
        emergencyId: EM,
        containerIds: [UNKNOWN],
        resourceId: DEST,
      }),
    ).rejects.toThrow(ShipmentContainerNotFoundError);
  });
});
