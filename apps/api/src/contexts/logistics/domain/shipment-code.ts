import { InvalidShipmentRouteError } from './shipment-errors';

/**
 * Builds the expedition's trackable code from a per-emergency sequence number,
 * zero-padded to 4 digits (`EXP-0001`, `EXP-0042`). This is the legible label /
 * QR payload printed on the truck/plane manifest — the "Código Único" of the
 * expedition validated in the field (see #163), sibling of {@link
 * formatContainerCode} (#140, the box's code).
 *
 * Single prefix (`EXP`, expedición) rather than one per carrier: the carrier is
 * unknown at creation (a planned shipment has none) and the model has no
 * truck/plane distinction to key on. Pure: the sequence itself is allocated by
 * the repository (infrastructure); this only formats it so the format stays a
 * single, testable domain rule.
 * ponytail: one prefix + one sequence; split per carrier only if the field asks.
 */
export function formatShipmentCode(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new InvalidShipmentRouteError(
      'Shipment code sequence must be a positive integer',
    );
  }
  return `EXP-${String(sequence).padStart(4, '0')}`;
}
