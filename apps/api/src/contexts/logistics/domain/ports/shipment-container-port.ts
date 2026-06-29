export const SHIPMENT_CONTAINER_PORT = Symbol('ShipmentContainerPort');

export interface LoadContainersOntoShipmentCommand {
  emergencyId: string;
  shipmentId: string;
  containerIds: string[];
}

export interface MoveContainersToResourceCommand {
  emergencyId: string;
  containerIds: string[];
  resourceId: string;
}

/**
 * Output port the logistics context uses to move {@link Container}s (the
 * supplies aggregate, #140) in and out of a shipment without reaching into the
 * supplies infrastructure. The adapter lives in this context's infrastructure
 * and is backed by the supplies ContainerRepository.
 *
 * Loading a container onto an expedition and unloading it at the destination is
 * a holder change (`resource → shipment → resource`); the Shipment aggregate
 * only records *which* container ids it carries, the Container owns its holder.
 */
export interface ShipmentContainerPort {
  /**
   * Loads each container onto the shipment (holder = shipment). Validates that
   * every container exists, belongs to `emergencyId`, and is not already loaded
   * onto a different shipment. Throws before mutating anything if any id is
   * invalid (all-or-nothing).
   */
  loadOntoShipment(cmd: LoadContainersOntoShipmentCommand): Promise<void>;

  /**
   * Moves the given containers to a resource (holder = resource) — used on
   * delivery (destination node, becomes its inventory) and on cancellation
   * (released back to the origin). Idempotent: re-moving to the same holder is
   * a no-op.
   */
  moveContainersToResource(cmd: MoveContainersToResourceCommand): Promise<void>;
}
