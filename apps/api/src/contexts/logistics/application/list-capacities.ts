import {
  ListCapacitiesFilter,
  TransportCapacityRepository,
} from '../domain/ports/transport-capacity.repository';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import {
  TransportCapacityStatus,
  TransportMode,
} from '../domain/transport-capacity-enums';
import { CapacityView, toCapacityView } from './capacity-view';

export interface ListCapacitiesQuery {
  emergencyId: string;
  mode?: TransportMode;
  status?: TransportCapacityStatus;
  availableFrom?: string;
  availableTo?: string;
}

export class ListCapacities {
  constructor(private readonly repo: TransportCapacityRepository) {}

  async execute(q: ListCapacitiesQuery): Promise<CapacityView[]> {
    const filter: ListCapacitiesFilter = {};
    if (q.mode !== undefined) filter.mode = q.mode;
    if (q.status !== undefined) filter.status = q.status;
    if (q.availableFrom !== undefined) filter.availableFrom = q.availableFrom;
    if (q.availableTo !== undefined) filter.availableTo = q.availableTo;

    const capacities = await this.repo.findByEmergency(
      EmergencyId.fromString(q.emergencyId),
      filter,
    );
    return capacities.map(toCapacityView);
  }
}
