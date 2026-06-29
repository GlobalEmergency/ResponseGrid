import { Resource } from '../resource';
import { ResourceId } from '../resource-id';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import {
  PublicStatus,
  ResourceType,
  VerificationLevel,
} from '../resource-enums';

export const RESOURCE_REPOSITORY = Symbol('ResourceRepository');

/**
 * A resource paired with the name of its owning emergency. Used by the
 * platform-admin reads, which are cross-emergency and therefore need to label
 * each row with its emergency without an N+1 lookup (the name is resolved in the
 * same query). `emergencyName` is null when the emergency row is missing.
 */
export interface ResourceWithEmergency {
  resource: Resource;
  emergencyName: string | null;
}

export interface ResourceRepository {
  save(resource: Resource): Promise<void>;
  findById(id: ResourceId): Promise<Resource | null>;
  findPendingByEmergency(emergencyId: EmergencyId): Promise<Resource[]>;
  /**
   * Paginated list of resources pending verification (unverified), optionally
   * filtered by type and a free-text search over name/address/city. Resolves
   * the coordination "bulk" problem when an emergency has hundreds of imported,
   * still-unverified points.
   */
  findPendingByEmergencyPaged(
    emergencyId: EmergencyId,
    q: {
      page: number;
      limit: number;
      type?: string;
      q?: string;
    },
  ): Promise<{ items: Resource[]; total: number }>;
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
  /** Resources currently flagged `disputed` (citizen reports pending review). */
  findDisputedByEmergency(emergencyId: EmergencyId): Promise<Resource[]>;
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

  /**
   * Platform-admin list: ALL resources regardless of status or verification
   * level, across every emergency (or one when `emergencyId` is given),
   * optionally filtered by type/status/verification and a free-text search over
   * name/address/city. Paginated. Each row carries its emergency name so the
   * admin console can label and group without an extra round-trip. Distinct from
   * the public/coordination reads, which never expose hidden/closed/unverified
   * points.
   */
  findAllPaged(q: {
    page: number;
    limit: number;
    emergencyId?: EmergencyId;
    type?: ResourceType;
    status?: PublicStatus;
    verification?: VerificationLevel;
    q?: string;
  }): Promise<{ items: ResourceWithEmergency[]; total: number }>;

  /**
   * Platform-admin single-resource lookup: returns a resource of ANY status
   * (the public lookup only returns visible/verified ones), paired with its
   * emergency name and its declared inventory hydrated. Null when not found.
   */
  findByIdForAdmin(id: ResourceId): Promise<ResourceWithEmergency | null>;
}
