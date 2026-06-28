import {
  ListShipmentsFilter,
  ShipmentRepository,
} from '../domain/ports/shipment.repository';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { ShipmentStatus } from '../domain/shipment-enums';
import { ShipmentView, toShipmentView } from './shipment-view';

export interface ListShipmentsQuery {
  emergencyId: string;
  status?: ShipmentStatus;
}

export class ListShipments {
  constructor(private readonly repo: ShipmentRepository) {}

  async execute(q: ListShipmentsQuery): Promise<ShipmentView[]> {
    const filter: ListShipmentsFilter = {};
    if (q.status !== undefined) filter.status = q.status;

    const shipments = await this.repo.findByEmergency(
      EmergencyId.fromString(q.emergencyId),
      filter,
    );
    return shipments.map(toShipmentView);
  }
}
