import { Shipment } from './shipment';
import { TransportMode } from './transport-capacity-enums';

/**
 * The compatibility criteria a {@link TransportCapacity} must satisfy to be a
 * candidate for a given {@link Shipment} (#107). Derived from the shipment by
 * {@link deriveShipmentMatchCriteria}.
 *
 * Every constraining dimension is OPTIONAL on purpose: a Shipment today does not
 * carry a required mode, a load weight/volume, a time window or restrictions, so
 * those fields come back "open" and impose NO filter (per the issue: don't
 * invent data). The matcher honours each one only when present, so the criteria
 * is future-proof for when shipments start carrying that information.
 */
export interface ShipmentMatchCriteria {
  emergencyId: string;
  originResourceId: string;
  destinationResourceId: string;
  /** Required transport mode, or null to not filter on mode. */
  requiredMode: TransportMode | null;
  /** Total load weight in kg, or null when unknown (no size filter on weight). */
  weightKg: number | null;
  /** Total load volume in m³, or null when unknown (no size filter on volume). */
  volumeM3: number | null;
  /** Time window the move must happen in; null bounds are open-ended. */
  window: { from: string | null; to: string | null };
  /** Restrictions the capacity must provide (normalized lowercase). */
  requiredConstraints: string[];
}

/**
 * Total weight/volume of a shipment's cargo. SupplyLine items and containers do
 * not carry weight or volume in the matcher today, so both come back null and
 * the size filter is skipped. When (and only when) the cargo begins to carry
 * those figures, summing them here makes the size filter kick in automatically
 * — no change needed at the matcher (see #142).
 */
function deriveLoad(_shipment: Shipment): {
  weightKg: number | null;
  volumeM3: number | null;
} {
  // No weight/volume on the cargo yet → unknown load. Do NOT fabricate data.
  return { weightKg: null, volumeM3: null };
}

export function deriveShipmentMatchCriteria(
  shipment: Shipment,
): ShipmentMatchCriteria {
  const { weightKg, volumeM3 } = deriveLoad(shipment);
  return {
    emergencyId: shipment.emergencyId.value,
    originResourceId: shipment.originResourceId,
    destinationResourceId: shipment.destinationResourceId,
    // Shipment carries no required mode / window / constraints today → open.
    requiredMode: null,
    weightKg,
    volumeM3,
    window: { from: null, to: null },
    requiredConstraints: [],
  };
}
