import { TransportCapacitySnapshot } from './transport-capacity';
import { ShipmentMatchCriteria } from './shipment-match-criteria';
import { CorridorCoverageProps } from './coverage';
import { capacityWindowOverlaps } from './window-overlap';
import { haversineMeters } from '../../../shared/domain/geo-distance';

/**
 * Pure compatibility predicate for #107: does this available capacity satisfy
 * the shipment's hard requirements? Each dimension is filtered ONLY when the
 * shipment actually constrains it (and, for size, only when the capacity also
 * declares that dimension) — a missing constraint never excludes. Coverage is
 * deliberately NOT a hard filter here; it is a ranking signal (see
 * {@link rankCapacitiesForShipment}).
 */
export function capacityMatchesShipment(
  capacity: TransportCapacitySnapshot,
  criteria: ShipmentMatchCriteria,
): boolean {
  // mode: only when the shipment requires one.
  if (criteria.requiredMode !== null && capacity.mode !== criteria.requiredMode) {
    return false;
  }

  // capacity >= load, per dimension, only when BOTH sides specify it.
  if (
    criteria.weightKg !== null &&
    capacity.capacity.weightKg !== null &&
    capacity.capacity.weightKg < criteria.weightKg
  ) {
    return false;
  }
  if (
    criteria.volumeM3 !== null &&
    capacity.capacity.volumeM3 !== null &&
    capacity.capacity.volumeM3 < criteria.volumeM3
  ) {
    return false;
  }

  // window overlap: reuse the SAME semantics as ListCapacities (#105).
  if (
    !capacityWindowOverlaps(capacity.window, {
      from: criteria.window.from ?? undefined,
      to: criteria.window.to ?? undefined,
    })
  ) {
    return false;
  }

  // constraints: capacity must provide every constraint the shipment requires.
  const provided = new Set(capacity.constraints);
  for (const required of criteria.requiredConstraints) {
    if (!provided.has(required)) return false;
  }

  return true;
}

/** Coordinates of the shipment's origin node, resolved once by the use case. */
export interface OriginLatLng {
  latitude: number;
  longitude: number;
}

/** Ranking tiers — lower sorts first. */
const TIER_EXACT_NODE = 0; // corridor endpoint matches a shipment node
const TIER_PROXIMITY = 1; // corridor with resolvable coords
const TIER_UNRESOLVED = 2; // area, or no usable coords/node — sort last

export interface RankedCapacity {
  capacity: TransportCapacitySnapshot;
  /** Distance origin→corridor-origin in meters, or null when unresolved. */
  distanceMeters: number | null;
}

function corridorOf(
  capacity: TransportCapacitySnapshot,
): CorridorCoverageProps | null {
  return capacity.coverage.kind === 'corridor' ? capacity.coverage : null;
}

/** A corridor endpoint resourceId equals the shipment origin or destination. */
function matchesShipmentNode(
  corridor: CorridorCoverageProps,
  criteria: ShipmentMatchCriteria,
): boolean {
  const nodes = [criteria.originResourceId, criteria.destinationResourceId];
  return (
    (corridor.originResourceId !== null &&
      nodes.includes(corridor.originResourceId)) ||
    (corridor.destinationResourceId !== null &&
      nodes.includes(corridor.destinationResourceId))
  );
}

/**
 * Spare-capacity measure for the tie-break ("least slack that still fits").
 * Sums the relative slack on whichever dimensions both sides specify; returns 0
 * when the load is unknown, so it stays a neutral tiebreak.
 */
function slackOf(
  capacity: TransportCapacitySnapshot,
  criteria: ShipmentMatchCriteria,
): number {
  let slack = 0;
  if (criteria.weightKg !== null && capacity.capacity.weightKg !== null) {
    slack += (capacity.capacity.weightKg - criteria.weightKg) / criteria.weightKg;
  }
  if (criteria.volumeM3 !== null && capacity.capacity.volumeM3 !== null) {
    slack += (capacity.capacity.volumeM3 - criteria.volumeM3) / criteria.volumeM3;
  }
  return slack;
}

interface SortKey {
  tier: number;
  distanceMeters: number; // Infinity when unresolved
  slack: number;
}

function sortKey(
  capacity: TransportCapacitySnapshot,
  criteria: ShipmentMatchCriteria,
  origin: OriginLatLng | null,
): SortKey {
  const corridor = corridorOf(capacity);
  const slack = slackOf(capacity, criteria);

  if (corridor !== null && matchesShipmentNode(corridor, criteria)) {
    const distanceMeters =
      origin !== null &&
      corridor.originLat !== null &&
      corridor.originLng !== null
        ? haversineMeters(
            origin.latitude,
            origin.longitude,
            corridor.originLat,
            corridor.originLng,
          )
        : 0;
    return { tier: TIER_EXACT_NODE, distanceMeters, slack };
  }

  if (
    corridor !== null &&
    origin !== null &&
    corridor.originLat !== null &&
    corridor.originLng !== null
  ) {
    const distanceMeters = haversineMeters(
      origin.latitude,
      origin.longitude,
      corridor.originLat,
      corridor.originLng,
    );
    return { tier: TIER_PROXIMITY, distanceMeters, slack };
  }

  return { tier: TIER_UNRESOLVED, distanceMeters: Infinity, slack };
}

/**
 * Ranks compatible capacities for a shipment (#107). Order: exact node-matching
 * corridors first, then corridors by ascending proximity of their origin to the
 * shipment origin, then area/unresolvable last — each tie broken by the tightest
 * capacity fit (least slack). Coverage is a ranking signal, never a hard filter.
 */
export function rankCapacitiesForShipment(
  capacities: TransportCapacitySnapshot[],
  criteria: ShipmentMatchCriteria,
  origin: OriginLatLng | null,
): RankedCapacity[] {
  return capacities
    .map((capacity) => ({ capacity, key: sortKey(capacity, criteria, origin) }))
    .sort((a, b) => {
      if (a.key.tier !== b.key.tier) return a.key.tier - b.key.tier;
      if (a.key.distanceMeters !== b.key.distanceMeters) {
        return a.key.distanceMeters - b.key.distanceMeters;
      }
      return a.key.slack - b.key.slack;
    })
    .map(({ capacity, key }) => ({
      capacity,
      distanceMeters: Number.isFinite(key.distanceMeters)
        ? Math.round(key.distanceMeters)
        : null,
    }));
}
