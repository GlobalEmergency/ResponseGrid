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
  countByEmergencyGroupedByPublicStatus(
    emergencyId: EmergencyId,
  ): Promise<Record<PublicStatus, number>>;
  /** Resources owned by a specific user within an emergency (any status). */
  findByOwnerAndEmergency(
    ownerUserId: string,
    emergencyId: EmergencyId,
  ): Promise<Resource[]>;
  /** Visible public resources: Active, Saturated, Paused (excludes Hidden and Closed). */
  findVisibleByEmergency(emergencyId: EmergencyId): Promise<Resource[]>;
  /** Lookup by external provenance key (sourceName + externalId). Returns null if not found. */
  findByExternal(
    sourceName: string,
    externalId: string,
  ): Promise<Resource | null>;
  /** Paginated list of visible resources, optionally filtered by category/country/q. */
  findVisiblePaged(
    emergencyId: EmergencyId,
    q: {
      page: number;
      limit: number;
      category?: string;
      country?: string;
      q?: string;
    },
  ): Promise<{ items: Resource[]; total: number }>;
  /** Aggregated facets (byCategory, byCountry) for visible resources of an emergency. */
  facets(emergencyId: EmergencyId): Promise<{
    byCategory: Record<string, number>;
    byCountry: Record<string, number>;
    total: number;
  }>;
  /** Visible resources near a point, ordered by distance ascending. */
  findNearbyVisible(
    emergencyId: EmergencyId,
    q: { lat: number; lng: number; radiusMeters: number; limit: number },
  ): Promise<Array<{ resource: Resource; distanceMeters: number }>>;
  /** Visible resources whose coordinates fall inside a bounding box. */
  findInBounds(
    emergencyId: EmergencyId,
    q: {
      minLat: number;
      minLng: number;
      maxLat: number;
      maxLng: number;
      limit: number;
    },
  ): Promise<Resource[]>;
}
