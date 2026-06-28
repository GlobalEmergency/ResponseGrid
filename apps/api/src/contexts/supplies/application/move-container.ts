import { ContainerRepository } from '../domain/ports/container.repository';
import { ContainerHolder } from '../domain/container';
import { ContainerId } from '../domain/container-id';
import { ContainerNotFoundError } from './container-not-found.error';

export interface MoveContainerCommand {
  containerId: string;
  /** New holder (resource ↔ shipment), or `null` to detach. */
  holder: ContainerHolder | null;
}

/**
 * Moves a container to a holder (a resource node or a shipment) or detaches it.
 * Composition is preserved — children follow their parent by reference.
 */
export class MoveContainer {
  constructor(private readonly repo: ContainerRepository) {}

  async execute(cmd: MoveContainerCommand): Promise<void> {
    const container = await this.repo.findById(
      ContainerId.fromString(cmd.containerId),
    );
    if (!container) throw new ContainerNotFoundError(cmd.containerId);

    container.moveToHolder(cmd.holder);
    await this.repo.save(container);
  }
}
