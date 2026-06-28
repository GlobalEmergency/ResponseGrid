import { Need } from '../need';
import { NeedId } from '../need-id';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import { Category, NeedStatus, Priority } from '../need-enums';

export const NEED_REPOSITORY = Symbol('NeedRepository');

export interface NeedFilters {
  category?: Category;
  priority?: Priority;
  /** Filter by linked resource / final recipient (#60). */
  resourceId?: string | null;
}

export interface NeedRepository {
  save(need: Need): Promise<void>;
  findById(id: NeedId): Promise<Need | null>;
  findValidatedByEmergency(
    emergencyId: EmergencyId,
    filters?: NeedFilters,
    /**
     * Optional server-side pagination. When omitted the full validated set is
     * returned (back-compat); when provided, results are deterministically
     * ordered (newest first, id as tiebreaker) and windowed.
     */
    pagination?: { limit: number; offset: number },
  ): Promise<Need[]>;
  /**
   * Returns validated (non-expired) needs within `radiusMeters` of the given
   * point, ordered by ascending distance, each annotated with its distance in
   * meters. Powers the "needs near me" view (#57).
   */
  findNearbyValidated(
    emergencyId: EmergencyId,
    q: { lat: number; lng: number; radiusMeters: number; limit: number },
  ): Promise<Array<{ need: Need; distanceMeters: number }>>;
  /**
   * Returns validated (non-expired) needs whose location falls inside the given
   * lat/lng bounding box, capped at `limit`. Powers the map: needs are loaded
   * for the visible viewport only, mirroring resources' findInBounds (#68).
   */
  findValidatedInBounds(
    emergencyId: EmergencyId,
    q: {
      minLat: number;
      minLng: number;
      maxLat: number;
      maxLng: number;
      limit: number;
    },
  ): Promise<Need[]>;
  /** Returns validated needs that have expired (expiresAt IS NOT NULL AND expiresAt <= now). */
  findExpiredByEmergency(
    emergencyId: EmergencyId,
    filters?: NeedFilters,
  ): Promise<Need[]>;
  findPendingByEmergency(
    emergencyId: EmergencyId,
    filters?: NeedFilters,
  ): Promise<Need[]>;
  /** Returns a count map for all NeedStatus values for the given emergency. */
  countByEmergencyGroupedByStatus(
    emergencyId: EmergencyId,
  ): Promise<Record<NeedStatus, number>>;
}
