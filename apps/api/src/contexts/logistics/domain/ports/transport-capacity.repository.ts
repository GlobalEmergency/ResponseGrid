import { TransportCapacity } from '../transport-capacity';
import { TransportCapacityId } from '../transport-capacity-id';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import {
  TransportCapacityStatus,
  TransportMode,
} from '../transport-capacity-enums';

export const TRANSPORT_CAPACITY_REPOSITORY = Symbol(
  'TransportCapacityRepository',
);

/**
 * Filter for listing capacities within an emergency. All fields are optional
 * and AND-combined. The window filter selects capacities whose availability
 * window overlaps the requested instants (open-ended bounds always overlap).
 */
export interface ListCapacitiesFilter {
  mode?: TransportMode;
  status?: TransportCapacityStatus;
  /** Keep only capacities still available at/after this instant (ISO). */
  availableFrom?: string;
  /** Keep only capacities available at/before this instant (ISO). */
  availableTo?: string;
}

export interface TransportCapacityRepository {
  save(capacity: TransportCapacity): Promise<void>;
  findById(id: TransportCapacityId): Promise<TransportCapacity | null>;
  findByEmergency(
    emergencyId: EmergencyId,
    filter: ListCapacitiesFilter,
  ): Promise<TransportCapacity[]>;
}
