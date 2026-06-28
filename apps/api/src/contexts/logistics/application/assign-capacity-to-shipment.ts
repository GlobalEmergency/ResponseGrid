import { ShipmentRepository } from '../domain/ports/shipment.repository';
import { ShipmentId } from '../domain/shipment-id';
import { CarrierPrincipal } from '../domain/shipment';
import { CarrierType } from '../domain/shipment-enums';
import { ShipmentNotFoundError } from './shipment-not-found.error';

export interface AssignCapacityToShipmentCommand {
  shipmentId: string;
  assignedCapacityId: string;
  /** Optional carrier — an internal transfer keeps this null. */
  carrier: { type: CarrierType; id: string } | null;
}

export class AssignCapacityToShipment {
  constructor(private readonly repo: ShipmentRepository) {}

  async execute(cmd: AssignCapacityToShipmentCommand): Promise<void> {
    const shipment = await this.repo.findById(
      ShipmentId.fromString(cmd.shipmentId),
    );
    if (!shipment) throw new ShipmentNotFoundError(cmd.shipmentId);

    const carrier: CarrierPrincipal | null = cmd.carrier
      ? { type: cmd.carrier.type, id: cmd.carrier.id }
      : null;

    shipment.assignCapacity(cmd.assignedCapacityId, carrier);
    await this.repo.save(shipment);
  }
}
