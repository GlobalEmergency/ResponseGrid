import { SealContainer } from './seal-container';
import { InMemoryContainerRepository } from '../infrastructure/in-memory-container.repository';
import { Container } from '../domain/container';
import { ContainerId } from '../domain/container-id';
import { ContainerStatus, ContainerType } from '../domain/container-enums';
import { ContainerSealedError } from '../domain/container-errors';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { ContainerNotFoundError } from './container-not-found.error';

const EM = '11111111-1111-4111-8111-111111111111';
const MISSING = '99999999-9999-4999-8999-999999999999';

function seed(repo: InMemoryContainerRepository): Container {
  const c = Container.create({
    id: ContainerId.create(),
    code: 'PAL-0001',
    type: ContainerType.Pallet,
    emergencyId: EmergencyId.fromString(EM),
  });
  void repo.save(c);
  return c;
}

describe('SealContainer', () => {
  it('seals an open container', async () => {
    const repo = new InMemoryContainerRepository();
    const c = seed(repo);
    await new SealContainer(repo).execute({ containerId: c.id.value });
    expect((await repo.findById(c.id))!.status).toBe(ContainerStatus.Sealed);
  });

  it('rejects sealing an already sealed container', async () => {
    const repo = new InMemoryContainerRepository();
    const c = seed(repo);
    const useCase = new SealContainer(repo);
    await useCase.execute({ containerId: c.id.value });
    await expect(useCase.execute({ containerId: c.id.value })).rejects.toThrow(
      ContainerSealedError,
    );
  });

  it('404s an unknown container', async () => {
    const repo = new InMemoryContainerRepository();
    await expect(
      new SealContainer(repo).execute({ containerId: MISSING }),
    ).rejects.toThrow(ContainerNotFoundError);
  });
});
