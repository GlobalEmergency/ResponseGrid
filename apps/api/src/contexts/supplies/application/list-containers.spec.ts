import { CreateContainer } from './create-container';
import { NestContainer } from './nest-container';
import { SealContainer } from './seal-container';
import { ListContainers } from './list-containers';
import { InMemoryContainerRepository } from '../infrastructure/in-memory-container.repository';
import {
  ContainerHolderType,
  ContainerStatus,
  ContainerType,
} from '../domain/container-enums';

const EM = '11111111-1111-4111-8111-111111111111';
const SHIPMENT = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('ListContainers', () => {
  it('filters by type, status, holder and top-level', async () => {
    const repo = new InMemoryContainerRepository();
    const create = new CreateContainer(repo);
    const nest = new NestContainer(repo);
    const seal = new SealContainer(repo);

    const pallet = await create.execute({
      emergencyId: EM,
      type: ContainerType.Pallet,
      holder: { type: ContainerHolderType.Shipment, id: SHIPMENT },
    });
    const box = await create.execute({
      emergencyId: EM,
      type: ContainerType.Box,
    });
    await nest.execute({ containerId: box.id, parentContainerId: pallet.id });
    await seal.execute({ containerId: pallet.id });

    const all = await new ListContainers(repo).execute({ emergencyId: EM });
    expect(all).toHaveLength(2);

    const pallets = await new ListContainers(repo).execute({
      emergencyId: EM,
      type: ContainerType.Pallet,
    });
    expect(pallets).toHaveLength(1);
    expect(pallets[0].code).toBe('PAL-0001');

    const sealed = await new ListContainers(repo).execute({
      emergencyId: EM,
      status: ContainerStatus.Sealed,
    });
    expect(sealed).toHaveLength(1);

    const topLevel = await new ListContainers(repo).execute({
      emergencyId: EM,
      topLevelOnly: true,
    });
    expect(topLevel).toHaveLength(1);
    expect(topLevel[0].id).toBe(pallet.id);

    const inShipment = await new ListContainers(repo).execute({
      emergencyId: EM,
      holderType: ContainerHolderType.Shipment,
      holderId: SHIPMENT,
    });
    expect(inShipment).toHaveLength(1);
    expect(inShipment[0].id).toBe(pallet.id);
  });

  it('returns an empty list for an emergency with no containers', async () => {
    const repo = new InMemoryContainerRepository();
    const list = await new ListContainers(repo).execute({
      emergencyId: '33333333-3333-4333-8333-333333333333',
    });
    expect(list).toEqual([]);
  });
});
