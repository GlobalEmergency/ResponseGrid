/**
 * A container referenced by a shipment's cargo manifest does not exist in the
 * shipment's emergency. Raised while loading containers onto a shipment.
 */
export class ShipmentContainerNotFoundError extends Error {
  constructor(readonly containerId: string) {
    super(`Container ${containerId} not found in this emergency`);
    this.name = 'ShipmentContainerNotFoundError';
  }
}

/**
 * A container cannot be loaded because it is already loaded onto a different
 * shipment. Raised while loading containers onto a shipment.
 */
export class ShipmentContainerUnavailableError extends Error {
  constructor(readonly containerId: string) {
    super(`Container ${containerId} is already loaded onto another shipment`);
    this.name = 'ShipmentContainerUnavailableError';
  }
}
