import { ShipmentRepository } from '../domain/ports/shipment.repository';
import { ShipmentEventBus } from '../domain/ports/shipment-event-bus';
import { ShipmentId } from '../domain/shipment-id';
import { ShipmentNotFoundError } from './shipment-not-found.error';
import { ShipmentActionUnauthorizedError } from './mark-shipment-in-transit';

export interface ConfirmShipmentDeliveryCommand {
  shipmentId: string;
  /** The authenticated user id (the carrier, when self-service). */
  requesterUserId: string;
  /** True when the requester is an admin or coordinator of the emergency. */
  isCoordinator: boolean;
}

export class ConfirmShipmentDelivery {
  constructor(
    private readonly repo: ShipmentRepository,
    private readonly bus: ShipmentEventBus,
  ) {}

  async execute(cmd: ConfirmShipmentDeliveryCommand): Promise<void> {
    const shipment = await this.repo.findById(
      ShipmentId.fromString(cmd.shipmentId),
    );
    if (!shipment) throw new ShipmentNotFoundError(cmd.shipmentId);

    const isCarrier = shipment.carrier?.id === cmd.requesterUserId;
    if (!cmd.isCoordinator && !isCarrier) {
      throw new ShipmentActionUnauthorizedError();
    }

    shipment.confirmDelivery();
    await this.repo.save(shipment);
    await this.bus.publish(shipment.pullDomainEvents());
  }
}
