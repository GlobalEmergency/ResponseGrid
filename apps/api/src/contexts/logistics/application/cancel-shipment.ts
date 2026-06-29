import { ShipmentRepository } from '../domain/ports/shipment.repository';
import { ShipmentContainerPort } from '../domain/ports/shipment-container-port';
import { ShipmentId } from '../domain/shipment-id';
import { ShipmentNotFoundError } from './shipment-not-found.error';

export interface CancelShipmentCommand {
  shipmentId: string;
}

/**
 * Cancels a shipment (planned|assigned → cancelled). Coordinator-only — the
 * controller enforces the permission/role; the domain enforces the transition.
 * Any loaded containers are released back to the origin node (holder = origin
 * resource) so a called-off expedition never strands inventory.
 */
export class CancelShipment {
  constructor(
    private readonly repo: ShipmentRepository,
    private readonly containerPort: ShipmentContainerPort,
  ) {}

  async execute(cmd: CancelShipmentCommand): Promise<void> {
    const shipment = await this.repo.findById(
      ShipmentId.fromString(cmd.shipmentId),
    );
    if (!shipment) throw new ShipmentNotFoundError(cmd.shipmentId);

    shipment.cancel();

    if (shipment.containerIds.length > 0) {
      await this.containerPort.moveContainersToResource({
        emergencyId: shipment.emergencyId.value,
        containerIds: shipment.containerIds,
        resourceId: shipment.originResourceId,
      });
    }

    await this.repo.save(shipment);
  }
}
