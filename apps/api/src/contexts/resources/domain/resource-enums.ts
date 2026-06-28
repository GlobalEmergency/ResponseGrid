export enum ResourceType {
  CollectionPoint = 'collection_point',
  DeliveryPoint = 'delivery_point',
  CollectionAndDelivery = 'collection_and_delivery',
  Warehouse = 'warehouse',
  Transport = 'transport',
  Supplier = 'supplier',
  Venue = 'venue',
}

export enum ResourceStage {
  Origin = 'origin',
  Intermediate = 'intermediate',
  Destination = 'destination',
}

export enum VerificationLevel {
  Unverified = 'unverified',
  Verified = 'verified',
  Official = 'official',
  /** Discarded during validation: leaves the verification queue, never public. */
  Rejected = 'rejected',
}

export enum PublicStatus {
  Hidden = 'hidden',
  Active = 'active',
  Saturated = 'saturated',
  Paused = 'paused',
  Closed = 'closed',
}
