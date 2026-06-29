import { CreateContainer } from './create-container';
import { InMemoryContainerRepository } from '../infrastructure/in-memory-container.repository';
import { ContainerId } from '../domain/container-id';
import {
  ContainerHolderType,
  ContainerStatus,
  ContainerType,
} from '../domain/container-enums';
import { Category } from '../domain/category';

const EM = '11111111-1111-4111-8111-111111111111';
const OTHER_EM = '22222222-2222-4222-8222-222222222222';
const RESOURCE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('CreateContainer', () => {
  it('creates an open, top-level container with a generated code', async () => {
    const repo = new InMemoryContainerRepository();
    const useCase = new CreateContainer(repo);

    const { id, code } = await useCase.execute({
      emergencyId: EM,
      type: ContainerType.Pallet,
    });

    expect(code).toBe('PAL-0001');
    const saved = await repo.findById(ContainerId.fromString(id));
    expect(saved).not.toBeNull();
    expect(saved!.status).toBe(ContainerStatus.Open);
    expect(saved!.parentContainerId).toBeNull();
    expect(saved!.type).toBe(ContainerType.Pallet);
  });

  it('allocates a per-(emergency, type) sequence', async () => {
    const repo = new InMemoryContainerRepository();
    const useCase = new CreateContainer(repo);

    const a = await useCase.execute({
      emergencyId: EM,
      type: ContainerType.Pallet,
    });
    const b = await useCase.execute({
      emergencyId: EM,
      type: ContainerType.Pallet,
    });
    const box = await useCase.execute({
      emergencyId: EM,
      type: ContainerType.Box,
    });
    const other = await useCase.execute({
      emergencyId: OTHER_EM,
      type: ContainerType.Pallet,
    });

    expect(a.code).toBe('PAL-0001');
    expect(b.code).toBe('PAL-0002');
    expect(box.code).toBe('CAJ-0001');
    expect(other.code).toBe('PAL-0001');
  });

  it('accepts initial lines, declared weight/volume and a holder', async () => {
    const repo = new InMemoryContainerRepository();
    const useCase = new CreateContainer(repo);

    const { id } = await useCase.execute({
      emergencyId: EM,
      type: ContainerType.Box,
      lines: [
        {
          name: 'Agua',
          quantity: 24,
          unit: 'botellas',
          category: Category.Water,
        },
      ],
      grossWeightKg: 18,
      grossVolumeM3: 0.2,
      holder: { type: ContainerHolderType.Resource, id: RESOURCE },
    });

    const saved = await repo.findById(ContainerId.fromString(id));
    expect(saved!.lines).toHaveLength(1);
    expect(saved!.grossWeightKg).toBe(18);
    expect(saved!.holder).toEqual({
      type: ContainerHolderType.Resource,
      id: RESOURCE,
    });
  });
});
