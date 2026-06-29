import { ContainerRepository } from '../../supplies/domain/ports/container.repository';
import { Container } from '../../supplies/domain/container';
import { ContainerId } from '../../supplies/domain/container-id';
import { ContainerHolderType } from '../../supplies/domain/container-enums';
import {
  LoadContainersOntoShipmentCommand,
  MoveContainersToResourceCommand,
  ShipmentContainerPort,
} from '../domain/ports/shipment-container-port';
import {
  ShipmentContainerNotFoundError,
  ShipmentContainerUnavailableError,
} from '../application/shipment-cargo-errors';

/**
 * Adapts the supplies {@link ContainerRepository} (#140) to the logistics
 * {@link ShipmentContainerPort}: it moves containers between a shipment and a
 * resource by changing the Container aggregate's holder. Lives in logistics
 * infrastructure (cross-context wiring), keeping the domain/application layers
 * free of the supplies persistence.
 */
export class SuppliesShipmentContainerAdapter implements ShipmentContainerPort {
  constructor(private readonly containers: ContainerRepository) {}

  async loadOntoShipment(
    cmd: LoadContainersOntoShipmentCommand,
  ): Promise<void> {
    // Resolve + validate every container before moving any (all-or-nothing):
    // an unknown, cross-emergency, or already-loaded container must fail
    // without leaving a half-loaded manifest behind.
    const loaded: Container[] = [];
    for (const id of cmd.containerIds) {
      const container = await this.find(id, cmd.emergencyId);
      const holder = container.holder;
      if (
        holder !== null &&
        holder.type === ContainerHolderType.Shipment &&
        holder.id !== cmd.shipmentId
      ) {
        throw new ShipmentContainerUnavailableError(id);
      }
      loaded.push(container);
    }

    for (const container of loaded) {
      container.moveToHolder({
        type: ContainerHolderType.Shipment,
        id: cmd.shipmentId,
      });
      await this.containers.save(container);
    }
  }

  async moveContainersToResource(
    cmd: MoveContainersToResourceCommand,
  ): Promise<void> {
    for (const id of cmd.containerIds) {
      const container = await this.find(id, cmd.emergencyId);
      container.moveToHolder({
        type: ContainerHolderType.Resource,
        id: cmd.resourceId,
      });
      await this.containers.save(container);
    }
  }

  private async find(id: string, emergencyId: string): Promise<Container> {
    const container = await this.containers.findById(
      ContainerId.fromString(id),
    );
    if (container === null || container.emergencyId.value !== emergencyId) {
      throw new ShipmentContainerNotFoundError(id);
    }
    return container;
  }
}
