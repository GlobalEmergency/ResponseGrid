import { ShipmentRepository } from '../domain/ports/shipment.repository';
import { ShipmentId } from '../domain/shipment-id';
import { ShipmentNotFoundError } from './shipment-not-found.error';

export interface CancelShipmentCommand {
  shipmentId: string;
}

/**
 * Cancels a shipment (planned|assigned → cancelled). Coordinator-only — the
 * controller enforces the permission/role; the domain enforces the transition.
 */
export class CancelShipment {
  constructor(private readonly repo: ShipmentRepository) {}

  async execute(cmd: CancelShipmentCommand): Promise<void> {
    const shipment = await this.repo.findById(
      ShipmentId.fromString(cmd.shipmentId),
    );
    if (!shipment) throw new ShipmentNotFoundError(cmd.shipmentId);

    shipment.cancel();
    await this.repo.save(shipment);
  }
}
