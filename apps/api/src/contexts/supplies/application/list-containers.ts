import {
  ContainerRepository,
  ListContainersFilter,
  ContainerHolderType,
  ContainerStatus,
  ContainerType,
} from '@globalemergency/warehouse-core/containers';
import { ContainerView, toContainerView } from './container-view';
import { ScopeId } from '@globalemergency/warehouse-core/kernel';

export interface ListContainersCommand {
  emergencyId: string;
  type?: ContainerType;
  status?: ContainerStatus;
  holderType?: ContainerHolderType;
  holderId?: string;
  topLevelOnly?: boolean;
}

/** Lists containers of an emergency (flat), filtered and newest-first. */
export class ListContainers {
  constructor(private readonly repo: ContainerRepository) {}

  async execute(cmd: ListContainersCommand): Promise<ContainerView[]> {
    const filter: ListContainersFilter = {
      ...(cmd.type !== undefined ? { type: cmd.type } : {}),
      ...(cmd.status !== undefined ? { status: cmd.status } : {}),
      ...(cmd.holderType !== undefined ? { holderType: cmd.holderType } : {}),
      ...(cmd.holderId !== undefined ? { holderId: cmd.holderId } : {}),
      ...(cmd.topLevelOnly !== undefined
        ? { topLevelOnly: cmd.topLevelOnly }
        : {}),
    };

    const containers = await this.repo.findByScope(
      ScopeId.fromString(cmd.emergencyId),
      filter,
    );
    return containers.map(toContainerView);
  }
}
