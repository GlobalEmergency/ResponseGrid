/**
 * Port used by the logistics context to resolve the coordinates of a resource
 * node (collection point) by id, for the #107 proximity ranking of capacity
 * suggestions.
 *
 * Infrastructure note: satisfied by a Drizzle adapter that reads the `resources`
 * table — an accepted, documented cross-context infra coupling, mirroring how
 * the offers context reads the `needs` table via its NeedLookup port.
 */
export const RESOURCE_LOCATION_LOOKUP = Symbol('ResourceLocationLookup');

export interface ResourceLatLng {
  latitude: number;
  longitude: number;
}

export interface ResourceLocationLookup {
  /**
   * Returns the coordinates of the resource, or null if the resource does not
   * exist (or has no usable coordinates).
   */
  findLatLng(resourceId: string): Promise<ResourceLatLng | null>;
}
