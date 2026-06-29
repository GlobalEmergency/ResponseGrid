import { Container } from '../container';
import { ContainerId } from '../container-id';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import {
  ContainerHolderType,
  ContainerStatus,
  ContainerType,
} from '../container-enums';

export const CONTAINER_REPOSITORY = Symbol('ContainerRepository');

/** Filter for listing containers within an emergency. AND-combined. */
export interface ListContainersFilter {
  type?: ContainerType;
  status?: ContainerStatus;
  holderType?: ContainerHolderType;
  holderId?: string;
  /** Only top-level containers (no parent) — the roots of the trees. */
  topLevelOnly?: boolean;
}

export interface ContainerRepository {
  save(container: Container): Promise<void>;
  findById(id: ContainerId): Promise<Container | null>;
  findByEmergency(
    emergencyId: EmergencyId,
    filter: ListContainersFilter,
  ): Promise<Container[]>;
  /** Direct children of a container (composition is by reference). */
  findChildren(parentId: ContainerId): Promise<Container[]>;
  /**
   * Allocates the next code sequence for a (emergency, type) pair. The domain
   * formats it into a code (`PAL-0001`); the running count lives in the store.
   */
  nextSequence(emergencyId: EmergencyId, type: ContainerType): Promise<number>;
}
