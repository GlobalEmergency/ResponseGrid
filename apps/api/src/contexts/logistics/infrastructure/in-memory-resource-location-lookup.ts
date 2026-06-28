import {
  ResourceLatLng,
  ResourceLocationLookup,
} from '../domain/ports/resource-location-lookup';

/**
 * In-memory {@link ResourceLocationLookup} for tests. Seed coordinates per
 * resource id; unknown ids resolve to null (the "unresolvable coords" path of
 * the #107 ranking).
 */
export class InMemoryResourceLocationLookup implements ResourceLocationLookup {
  private store = new Map<string, ResourceLatLng>();

  set(resourceId: string, latLng: ResourceLatLng): void {
    this.store.set(resourceId, latLng);
  }

  findLatLng(resourceId: string): Promise<ResourceLatLng | null> {
    return Promise.resolve(this.store.get(resourceId) ?? null);
  }
}
