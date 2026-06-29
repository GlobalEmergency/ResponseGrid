import { ContainerRepository } from '../domain/ports/container.repository';
import { ContainerId } from '../domain/container-id';
import { SupplyLine, SupplyLineProps } from '../domain/supply-line';
import { ContainerNotFoundError } from './container-not-found.error';

export interface AddLineToContainerCommand {
  containerId: string;
  line: SupplyLineProps;
}

/** Adds a loose supply line to an open container. */
export class AddLineToContainer {
  constructor(private readonly repo: ContainerRepository) {}

  async execute(cmd: AddLineToContainerCommand): Promise<void> {
    const container = await this.repo.findById(
      ContainerId.fromString(cmd.containerId),
    );
    if (!container) throw new ContainerNotFoundError(cmd.containerId);

    container.addLine(SupplyLine.create(cmd.line));
    await this.repo.save(container);
  }
}
