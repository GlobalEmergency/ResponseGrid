import {
  TransportCapacityRepository,
  TransportCapacityFilters,
} from '../domain/ports/transport-capacity.repository';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import {
  TransportMode,
  CapacityStatus,
} from '../domain/transport-capacity-enums';
import { CapacityView, toCapacityView } from './capacity-view';

export interface ListCapacitiesQuery {
  emergencyId: string;
  mode?: TransportMode;
  status?: CapacityStatus;
}

export class ListCapacities {
  constructor(private readonly repo: TransportCapacityRepository) {}

  async execute(query: ListCapacitiesQuery): Promise<CapacityView[]> {
    const filters: TransportCapacityFilters = {};
    if (query.mode !== undefined) filters.mode = query.mode;
    if (query.status !== undefined) filters.status = query.status;

    const capacities = await this.repo.findByEmergency(
      EmergencyId.fromString(query.emergencyId),
      filters,
    );
    return capacities.map(toCapacityView);
  }
}
