import { Resource } from '../resource';
import { ResourceId } from '../resource-id';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import { PublicStatus } from '../resource-enums';

export const RESOURCE_REPOSITORY = Symbol('ResourceRepository');

export interface ResourceRepository {
  save(resource: Resource): Promise<void>;
  findById(id: ResourceId): Promise<Resource | null>;
  findPendingByEmergency(emergencyId: EmergencyId): Promise<Resource[]>;
  findActiveByEmergency(emergencyId: EmergencyId): Promise<Resource[]>;
  /** Returns a count map for all PublicStatus values for the given emergency. */
  countByEmergencyGroupedByPublicStatus(emergencyId: EmergencyId): Promise<Record<PublicStatus, number>>;
}
