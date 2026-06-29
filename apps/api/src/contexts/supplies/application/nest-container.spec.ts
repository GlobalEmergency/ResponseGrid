import { NestContainer } from './nest-container';
import { InMemoryContainerRepository } from '../infrastructure/in-memory-container.repository';
import { Container } from '../domain/container';
import { ContainerId } from '../domain/container-id';
import { ContainerType } from '../domain/container-enums';
import {
  ContainerCycleError,
  ContainerEmergencyMismatchError,
} from '../domain/container-errors';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { ContainerNotFoundError } from './container-not-found.error';

const EM = '11111111-1111-4111-8111-111111111111';
const OTHER_EM = '22222222-2222-4222-8222-222222222222';
const MISSING = '99999999-9999-4999-8999-999999999999';

function make(
  repo: InMemoryContainerRepository,
  type: ContainerType,
  emergencyId = EM,
): Container {
  const c = Container.create({
    id: ContainerId.create(),
    code: `${type}-x`,
    type,
    emergencyId: EmergencyId.fromString(emergencyId),
  });
  void repo.save(c);
  return c;
}

describe('NestContainer', () => {
  it('nests a box under a pallet and un-nests it', async () => {
    const repo = new InMemoryContainerRepository();
    const useCase = new NestContainer(repo);
    const pallet = make(repo, ContainerType.Pallet);
    const box = make(repo, ContainerType.Box);

    await useCase.execute({
      containerId: box.id.value,
      parentContainerId: pallet.id.value,
    });
    expect((await repo.findById(box.id))!.parentContainerId?.value).toBe(
      pallet.id.value,
    );
    expect(await repo.findChildren(pallet.id)).toHaveLength(1);

    await useCase.execute({
      containerId: box.id.value,
      parentContainerId: null,
    });
    expect((await repo.findById(box.id))!.parentContainerId).toBeNull();
  });

  it('rejects a direct cycle (parent === child)', async () => {
    const repo = new InMemoryContainerRepository();
    const useCase = new NestContainer(repo);
    const c = make(repo, ContainerType.Pallet);
    await expect(
      useCase.execute({
        containerId: c.id.value,
        parentContainerId: c.id.value,
      }),
    ).rejects.toThrow(ContainerCycleError);
  });

  it('rejects an indirect cycle (parent is a descendant of the child)', async () => {
    const repo = new InMemoryContainerRepository();
    const useCase = new NestContainer(repo);
    const a = make(repo, ContainerType.Pallet);
    const b = make(repo, ContainerType.Box);
    const c = make(repo, ContainerType.Box);

    await useCase.execute({
      containerId: b.id.value,
      parentContainerId: a.id.value,
    });
    await useCase.execute({
      containerId: c.id.value,
      parentContainerId: b.id.value,
    });

    // a → b → c already; nesting a under c would close the loop.
    await expect(
      useCase.execute({
        containerId: a.id.value,
        parentContainerId: c.id.value,
      }),
    ).rejects.toThrow(ContainerCycleError);
  });

  it('rejects nesting across emergencies', async () => {
    const repo = new InMemoryContainerRepository();
    const useCase = new NestContainer(repo);
    const pallet = make(repo, ContainerType.Pallet, EM);
    const box = make(repo, ContainerType.Box, OTHER_EM);
    await expect(
      useCase.execute({
        containerId: box.id.value,
        parentContainerId: pallet.id.value,
      }),
    ).rejects.toThrow(ContainerEmergencyMismatchError);
  });

  it('404s an unknown child or parent', async () => {
    const repo = new InMemoryContainerRepository();
    const useCase = new NestContainer(repo);
    const pallet = make(repo, ContainerType.Pallet);

    await expect(
      useCase.execute({
        containerId: MISSING,
        parentContainerId: pallet.id.value,
      }),
    ).rejects.toThrow(ContainerNotFoundError);
    await expect(
      useCase.execute({
        containerId: pallet.id.value,
        parentContainerId: MISSING,
      }),
    ).rejects.toThrow(ContainerNotFoundError);
  });
});
