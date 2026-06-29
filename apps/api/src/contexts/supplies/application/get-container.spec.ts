import { CreateContainer } from './create-container';
import { AddLineToContainer } from './add-line-to-container';
import { NestContainer } from './nest-container';
import { SealContainer } from './seal-container';
import { GetContainer } from './get-container';
import { InMemoryContainerRepository } from '../infrastructure/in-memory-container.repository';
import { ContainerStatus, ContainerType } from '../domain/container-enums';
import { Category } from '../domain/category';
import { ContainerNotFoundError } from './container-not-found.error';

const EM = '11111111-1111-4111-8111-111111111111';
const MISSING = '99999999-9999-4999-8999-999999999999';

/**
 * Acceptance (issue #140): create a pallet, put boxes in it, put lines into the
 * boxes, seal it, and read the tree with aggregated weight/volume.
 */
describe('GetContainer (tree + totals)', () => {
  it('assembles the sub-tree and aggregates weight/volume', async () => {
    const repo = new InMemoryContainerRepository();
    const create = new CreateContainer(repo);
    const nest = new NestContainer(repo);
    const addLine = new AddLineToContainer(repo);
    const seal = new SealContainer(repo);

    const pallet = await create.execute({
      emergencyId: EM,
      type: ContainerType.Pallet,
      grossWeightKg: 15, // the empty pallet itself
    });
    const boxA = await create.execute({
      emergencyId: EM,
      type: ContainerType.Box,
      grossWeightKg: 20,
      grossVolumeM3: 0.3,
    });
    const boxB = await create.execute({
      emergencyId: EM,
      type: ContainerType.Box,
      grossWeightKg: 10,
    });

    await nest.execute({ containerId: boxA.id, parentContainerId: pallet.id });
    await nest.execute({ containerId: boxB.id, parentContainerId: pallet.id });
    await addLine.execute({
      containerId: boxA.id,
      line: {
        name: 'Agua',
        quantity: 24,
        unit: 'botellas',
        category: Category.Water,
      },
    });
    await seal.execute({ containerId: boxA.id });

    const tree = await new GetContainer(repo).execute({
      containerId: pallet.id,
    });

    expect(tree.code).toBe('PAL-0001');
    expect(tree.children).toHaveLength(2);
    expect(tree.totalWeightKg).toBe(45); // 15 + 20 + 10
    expect(tree.totalVolumeM3).toBe(0.3); // only boxA declared volume
    const sealedChild = tree.children.find((c) => c.code === boxA.code);
    expect(sealedChild!.status).toBe(ContainerStatus.Sealed);
    expect(sealedChild!.lines[0].name).toBe('Agua');
  });

  it('reports null totals when nothing in the sub-tree declared a magnitude', async () => {
    const repo = new InMemoryContainerRepository();
    const create = new CreateContainer(repo);
    const { id } = await create.execute({
      emergencyId: EM,
      type: ContainerType.Lote,
    });
    const tree = await new GetContainer(repo).execute({ containerId: id });
    expect(tree.totalWeightKg).toBeNull();
    expect(tree.totalVolumeM3).toBeNull();
    expect(tree.children).toHaveLength(0);
  });

  it('404s an unknown container', async () => {
    const repo = new InMemoryContainerRepository();
    await expect(
      new GetContainer(repo).execute({ containerId: MISSING }),
    ).rejects.toThrow(ContainerNotFoundError);
  });
});
