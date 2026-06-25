import { Resource } from '../resource';
import { ResourceId } from '../resource-id';
import { EmergencyId } from '../emergency-id';

export const RESOURCE_REPOSITORY = Symbol('ResourceRepository');

export interface ResourceRepository {
  save(resource: Resource): Promise<void>;
  findById(id: ResourceId): Promise<Resource | null>;
  findPendingByEmergency(emergencyId: EmergencyId): Promise<Resource[]>;
  findActiveByEmergency(emergencyId: EmergencyId): Promise<Resource[]>;
}
