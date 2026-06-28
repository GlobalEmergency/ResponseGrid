export const SHIPMENT_AUTHORIZATION_LOOKUP = Symbol(
  'ShipmentAuthorizationLookup',
);

/** The minimal facts the controller needs to authorize an action on a shipment. */
export interface ShipmentAuthorizationFacts {
  emergencyId: string;
  /** The carrier principal id, or null on an internal transfer / unassigned. */
  carrierId: string | null;
}

/**
 * Resolves the owning emergency and carrier of a shipment so the controller can
 * decide whether the requester is the carrier (self-service in_transit/deliver)
 * or a coordinator of that emergency. Mirrors the capacity-emergency-lookup;
 * reads only the logistics table, so there is no cross-context coupling.
 */
export interface ShipmentAuthorizationLookup {
  /** The facts, or null when the shipment does not exist. */
  findAuthorizationFacts(
    shipmentId: string,
  ): Promise<ShipmentAuthorizationFacts | null>;
}
