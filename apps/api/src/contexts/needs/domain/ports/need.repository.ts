import { Need } from '../need';
import { NeedId } from '../need-id';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import { NeedCategory, NeedStatus, Priority } from '../need-enums';

export const NEED_REPOSITORY = Symbol('NeedRepository');

export interface NeedFilters {
  category?: NeedCategory;
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
