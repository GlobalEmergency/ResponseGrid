import {
  ContainerRepository,
  ContainerId,
} from '@globalemergency/warehouse-core/containers';
import {
  SupplyLine,
  SupplyLineProps,
} from '@globalemergency/warehouse-core/kernel';
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
