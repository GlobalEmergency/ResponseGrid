import {
  ContainerRepository,
  ContainerId,
} from '@globalemergency/warehouse-core/containers';
import { ContainerNotFoundError } from './container-not-found.error';

export interface RemoveLineFromContainerCommand {
  containerId: string;
  index: number;
}

/** Removes the supply line at `index` from an open container. */
export class RemoveLineFromContainer {
  constructor(private readonly repo: ContainerRepository) {}

  async execute(cmd: RemoveLineFromContainerCommand): Promise<void> {
    const container = await this.repo.findById(
      ContainerId.fromString(cmd.containerId),
    );
    if (!container) throw new ContainerNotFoundError(cmd.containerId);

    container.removeLineAt(cmd.index);
    await this.repo.save(container);
  }
}
