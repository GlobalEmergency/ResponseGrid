import { CapacityWindowProps } from './capacity-window.js';

/**
 * The half-open interval to test a capacity window against. Both bounds are
 * optional ISO-8601 instants; a missing bound means "no constraint on that
 * side". Mirrors {@link ListCapacitiesFilter}'s availableFrom/availableTo.
 */
export interface WindowInterval {
  from?: string | undefined;
  to?: string | undefined;
}

/**
 * Single source of truth for capacity-window overlap. A capacity's availability
 * window overlaps the requested `[from, to]` interval when it does NOT end
 * before `from` and does NOT start after `to`. Null/undefined bounds on either
 * side are open-ended and always overlap on that side.
 *
 * Extracted from the in-memory repository (#105) so the #107 matching reuses the
 * exact same semantics rather than re-deriving them. The Drizzle repository
 * encodes the identical predicate in SQL (isNull/gte/lte) for the DB read path.
 */
export function capacityWindowOverlaps(
  window: CapacityWindowProps,
  interval: WindowInterval,
): boolean {
  if (interval.from !== undefined && window.to !== null) {
    if (window.to < interval.from) return false;
  }
  if (interval.to !== undefined && window.from !== null) {
    if (window.from > interval.to) return false;
  }
  return true;
}
