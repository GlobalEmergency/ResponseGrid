import { TransportCapacity } from '../transport-capacity';
import { TransportCapacityId } from '../transport-capacity-id';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import { TransportMode, CapacityStatus } from '../transport-capacity-enums';

export const TRANSPORT_CAPACITY_REPOSITORY = Symbol(
  'TransportCapacityRepository',
);

export interface TransportCapacityFilters {
  mode?: TransportMode;
  status?: CapacityStatus;
}

export interface TransportCapacityRepository {
  save(capacity: TransportCapacity): Promise<void>;
  findById(id: TransportCapacityId): Promise<TransportCapacity | null>;
  findByEmergency(
    emergencyId: EmergencyId,
    filters?: TransportCapacityFilters,
  ): Promise<TransportCapacity[]>;
}
