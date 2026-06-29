import { ContainerRepository } from '../domain/ports/container.repository';
import { ContainerId } from '../domain/container-id';
import { ContainerNotFoundError } from './container-not-found.error';

export interface SealContainerCommand {
  containerId: string;
}

/** Seals (precinta) a container: open → sealed, freezing its lines. */
export class SealContainer {
  constructor(private readonly repo: ContainerRepository) {}

  async execute(cmd: SealContainerCommand): Promise<void> {
    const container = await this.repo.findById(
      ContainerId.fromString(cmd.containerId),
    );
    if (!container) throw new ContainerNotFoundError(cmd.containerId);

    container.seal();
    await this.repo.save(container);
  }
}
