export enum ResourceType {
  CollectionPoint = 'collection_point',
  DeliveryPoint = 'delivery_point',
  CollectionAndDelivery = 'collection_and_delivery',
  Warehouse = 'warehouse',
  Transport = 'transport',
  Supplier = 'supplier',
  Venue = 'venue',
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
  /** En preparación: aún no operativo, pero públicamente visible. */
  Preparing = 'preparing',
  /** Alojamiento asistido / colectivo específico; públicamente visible. */
  Assisted = 'assisted',
}
