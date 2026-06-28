import { ShipmentRepository } from '../domain/ports/shipment.repository';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { ShipmentView, toShipmentView } from './shipment-view';

export interface GetMyShipmentsQuery {
  /** The authenticated carrier (volunteer or organization member) id. */
  carrierId: string;
  /** Optional emergency scope; null lists across all emergencies. */
  emergencyId: string | null;
}

/** "Mis expediciones" — the shipments assigned to the requesting carrier. */
export class GetMyShipments {
  constructor(private readonly repo: ShipmentRepository) {}

  async execute(q: GetMyShipmentsQuery): Promise<ShipmentView[]> {
    const shipments = await this.repo.findByCarrier(
      q.carrierId,
      q.emergencyId !== null ? EmergencyId.fromString(q.emergencyId) : null,
    );
    return shipments.map(toShipmentView);
  }
}
