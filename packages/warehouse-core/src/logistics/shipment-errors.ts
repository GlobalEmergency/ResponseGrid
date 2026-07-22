import { ShipmentStatus } from './shipment-enums.js';

/**
 * A shipment must move *something*: at least one loose {@link SupplyLine} or at
 * least one {@link Container}. Raised by {@link Shipment.create} when both the
 * lines and the container manifest are empty.
 */
export class ShipmentMustHaveCargoError extends Error {
  constructor() {
    super('A shipment must carry at least one supply line or container');
    this.name = 'ShipmentMustHaveCargoError';
  }
}

export class InvalidShipmentRouteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidShipmentRouteError';
  }
}

/**
 * Raised when a shipment references a vehicle (`vehicleId`) but ALSO carries
 * loose cargo. In vehicle mode the cargo IS the vehicle's current inventory, so
 * `items` and `containerIds` must be empty — the two modes are exclusive.
 */
export class VehicleShipmentCargoError extends Error {
  constructor() {
    super(
      'A vehicle shipment carries the vehicle inventory; loose items and containers must be empty',
    );
    this.name = 'VehicleShipmentCargoError';
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
