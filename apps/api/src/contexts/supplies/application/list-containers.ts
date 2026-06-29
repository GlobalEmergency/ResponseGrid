import {
  ContainerRepository,
  ListContainersFilter,
} from '../domain/ports/container.repository';
import {
  ContainerHolderType,
  ContainerStatus,
  ContainerType,
} from '../domain/container-enums';
import { ContainerView, toContainerView } from './container-view';
import { EmergencyId } from '../../../shared/domain/emergency-id';

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

    const containers = await this.repo.findByEmergency(
      EmergencyId.fromString(cmd.emergencyId),
      filter,
    );
    return containers.map(toContainerView);
  }
}
