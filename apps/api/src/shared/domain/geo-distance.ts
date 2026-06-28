/**
 * Shared Kernel — great-circle distance helper.
 *
 * Pure function with no framework or I/O dependency. Computes the distance in
 * meters between two WGS84 coordinates using the haversine formula. Used by
 * in-memory repositories (test parity with the Postgres `earth_distance`
 * geo index) and by application use cases that need to derive a display
 * distance from the *public* (possibly approximated) coordinates of a need.
 */

const EARTH_RADIUS_METERS = 6_371_000;

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
