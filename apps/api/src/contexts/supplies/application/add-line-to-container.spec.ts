import { AddLineToContainer } from './add-line-to-container';
import { RemoveLineFromContainer } from './remove-line-from-container';
import { SealContainer } from './seal-container';
import { InMemoryContainerRepository } from '../infrastructure/in-memory-container.repository';
import {
  Container,
  ContainerId,
  ContainerType,
  ContainerSealedError,
} from '@globalemergency/warehouse-core/containers';
import { Category } from '@globalemergency/warehouse-core/kernel';
import { ScopeId } from '@globalemergency/warehouse-core/kernel';
import { ContainerNotFoundError } from './container-not-found.error';

const EM = '11111111-1111-4111-8111-111111111111';
const MISSING = '99999999-9999-4999-8999-999999999999';

function seed(repo: InMemoryContainerRepository): Container {
  const c = Container.create({
    id: ContainerId.create(),
    code: 'CAJ-0001',
    type: ContainerType.Box,
    scopeId: ScopeId.fromString(EM),
  });
  void repo.save(c);
  return c;
}

const LINE = {
  name: 'Agua',
  quantity: 10,
  unit: 'botellas',
  category: Category.Water,
};

describe('Add/RemoveLineToContainer', () => {
  it('adds a line to an open container', async () => {
    const repo = new InMemoryContainerRepository();
    const c = seed(repo);
    await new AddLineToContainer(repo).execute({
      containerId: c.id.value,
      line: LINE,
    });
    const saved = await repo.findById(c.id);
    expect(saved!.lines).toHaveLength(1);
    expect(saved!.lines[0].name).toBe('Agua');
  });

  it('removes a line by index', async () => {
    const repo = new InMemoryContainerRepository();
    const c = seed(repo);
    await new AddLineToContainer(repo).execute({
      containerId: c.id.value,
      line: LINE,
    });
    await new AddLineToContainer(repo).execute({
      containerId: c.id.value,
      line: { ...LINE, name: 'Mantas', category: Category.Shelter },
    });
    await new RemoveLineFromContainer(repo).execute({
      containerId: c.id.value,
      index: 0,
    });
    const saved = await repo.findById(c.id);
    expect(saved!.lines).toHaveLength(1);
    expect(saved!.lines[0].name).toBe('Mantas');
  });

  it('refuses to add a line to a sealed container', async () => {
    const repo = new InMemoryContainerRepository();
    const c = seed(repo);
    await new SealContainer(repo).execute({ containerId: c.id.value });
    await expect(
      new AddLineToContainer(repo).execute({
        containerId: c.id.value,
        line: LINE,
      }),
    ).rejects.toThrow(ContainerSealedError);
  });

  it('404s an unknown container', async () => {
    const repo = new InMemoryContainerRepository();
    await expect(
      new AddLineToContainer(repo).execute({
        containerId: MISSING,
        line: LINE,
      }),
    ).rejects.toThrow(ContainerNotFoundError);
  });
});
