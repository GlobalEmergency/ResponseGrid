import { ShipmentRepository } from '../domain/ports/shipment.repository';
import { ShipmentId } from '../domain/shipment-id';
import { ShipmentNotFoundError } from './shipment-not-found.error';

export class ShipmentActionUnauthorizedError extends Error {
  constructor() {
    super('Only the assigned carrier or a coordinator can act on a shipment');
    this.name = 'ShipmentActionUnauthorizedError';
  }
}

export interface MarkShipmentInTransitCommand {
  shipmentId: string;
  /** The authenticated user id (the carrier, when self-service). */
  requesterUserId: string;
  /** True when the requester is an admin or coordinator of the emergency. */
  isCoordinator: boolean;
}

export class MarkShipmentInTransit {
  constructor(private readonly repo: ShipmentRepository) {}

  async execute(cmd: MarkShipmentInTransitCommand): Promise<void> {
    const shipment = await this.repo.findById(
      ShipmentId.fromString(cmd.shipmentId),
    );
    if (!shipment) throw new ShipmentNotFoundError(cmd.shipmentId);

    const isCarrier = shipment.carrier?.id === cmd.requesterUserId;
    if (!cmd.isCoordinator && !isCarrier) {
      throw new ShipmentActionUnauthorizedError();
    }

    shipment.markInTransit();
    await this.repo.save(shipment);
  }
}
