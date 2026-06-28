/** Mode of transport offered. The citizen with a moto/car/van/truck is `road`. */
export enum TransportMode {
  Road = 'road',
  Sea = 'sea',
  Air = 'air',
}

/** Who offers the capacity — a polymorphic principal (cf. EPIC #103). */
export enum ProviderType {
  Volunteer = 'volunteer',
  Organization = 'organization',
}

export enum CapacityStatus {
  /** Open and offerable. */
  Available = 'available',
  /** Held for a shipment (cf. #106). */
  Reserved = 'reserved',
  /** The provider has retired the offer. */
  Withdrawn = 'withdrawn',
}
