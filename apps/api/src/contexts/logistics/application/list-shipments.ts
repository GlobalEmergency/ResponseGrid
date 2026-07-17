import {
  ListShipmentsFilter,
  ShipmentRepository,
} from '@globalemergency/warehouse-core/logistics';
import { ScopeId } from '@globalemergency/warehouse-core/kernel';
import { ShipmentStatus } from '@globalemergency/warehouse-core/logistics';
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

    const shipments = await this.repo.findByScope(
      ScopeId.fromString(q.emergencyId),
      filter,
    );
    return shipments.map(toShipmentView);
  }
}
