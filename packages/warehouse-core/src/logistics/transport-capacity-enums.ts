/**
 * Transport mode of a capacity offer. Ground vehicles (moto, coche, camioneta,
 * camión) all map to `road`; maritime to `sea`; aerial to `air`. Kept coarse on
 * purpose — the matching cares about the medium, not the exact vehicle.
 */
export enum TransportMode {
  Road = 'road',
  Sea = 'sea',
  Air = 'air',
}

/**
 * Lifecycle of a capacity offer. `available` when published, `reserved` once a
 * coordinator earmarks it for a shipment (kept for the future expedición flow,
 * EPIC #103), `withdrawn` when the provider retires it.
 */
export enum TransportCapacityStatus {
  Available = 'available',
  Reserved = 'reserved',
  Withdrawn = 'withdrawn',
}

/**
 * Who is offering the capacity. Polymorphic by design (mirrors how grants model
 * their principal): a capacity can come from a volunteer with a vehicle or from
 * a transport organization, with no FK to either table.
 */
export enum TransportProviderType {
  Volunteer = 'volunteer',
  Organization = 'organization',
}

export function isTransportMode(value: string): value is TransportMode {
  return (Object.values(TransportMode) as string[]).includes(value);
}

export function isTransportProviderType(
  value: string,
): value is TransportProviderType {
  return (Object.values(TransportProviderType) as string[]).includes(value);
}
