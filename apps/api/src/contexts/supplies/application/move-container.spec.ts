import { MoveContainer } from './move-container';
import { InMemoryContainerRepository } from '../infrastructure/in-memory-container.repository';
import { Container } from '../domain/container';
import { ContainerId } from '../domain/container-id';
import { ContainerHolderType, ContainerType } from '../domain/container-enums';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { ContainerNotFoundError } from './container-not-found.error';

const EM = '11111111-1111-4111-8111-111111111111';
const RESOURCE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SHIPMENT = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const MISSING = '99999999-9999-4999-8999-999999999999';

function seed(repo: InMemoryContainerRepository): Container {
  const c = Container.create({
    id: ContainerId.create(),
    code: 'PAL-0001',
    type: ContainerType.Pallet,
    emergencyId: EmergencyId.fromString(EM),
    holder: { type: ContainerHolderType.Resource, id: RESOURCE },
  });
  void repo.save(c);
  return c;
}

describe('MoveContainer', () => {
  it('moves from a resource to a shipment and detaches', async () => {
    const repo = new InMemoryContainerRepository();
    const c = seed(repo);
    const useCase = new MoveContainer(repo);

    await useCase.execute({
      containerId: c.id.value,
      holder: { type: ContainerHolderType.Shipment, id: SHIPMENT },
    });
    expect((await repo.findById(c.id))!.holder).toEqual({
      type: ContainerHolderType.Shipment,
      id: SHIPMENT,
    });

    await useCase.execute({ containerId: c.id.value, holder: null });
    expect((await repo.findById(c.id))!.holder).toBeNull();
  });

  it('404s an unknown container', async () => {
    const repo = new InMemoryContainerRepository();
    await expect(
      new MoveContainer(repo).execute({ containerId: MISSING, holder: null }),
    ).rejects.toThrow(ContainerNotFoundError);
  });
});
