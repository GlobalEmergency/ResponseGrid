import { ShipmentStatus } from './shipment-enums';

export class ShipmentMustHaveItemsError extends Error {
  constructor() {
    super('A shipment must declare at least one item');
    this.name = 'ShipmentMustHaveItemsError';
  }
}

export class ShipmentItemValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShipmentItemValidationError';
  }
}

export class InvalidShipmentRouteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidShipmentRouteError';
  }
}

/**
 * Raised when a status transition is not allowed from the current status
 * (e.g. delivering a shipment that is not in transit). Carries both ends so the
 * HTTP layer can render a precise 409.
 */
export class InvalidShipmentTransitionError extends Error {
  constructor(
    readonly from: ShipmentStatus,
    readonly to: ShipmentStatus,
  ) {
    super(`Cannot transition shipment from '${from}' to '${to}'`);
    this.name = 'InvalidShipmentTransitionError';
  }
}
