export enum ResourceType {
  CollectionPoint = 'collection_point',
  DeliveryPoint = 'delivery_point',
  Warehouse = 'warehouse',
  Transport = 'transport',
  Supplier = 'supplier',
  Venue = 'venue',
}
export enum ResourceSide {
  Origin = 'origin',
  Destination = 'destination',
}
export enum VerificationLevel {
  Unverified = 'unverified',
  Verified = 'verified',
  Official = 'official',
}
export enum PublicStatus {
  Hidden = 'hidden',
  Active = 'active',
  Saturated = 'saturated',
  Paused = 'paused',
  Closed = 'closed',
}
