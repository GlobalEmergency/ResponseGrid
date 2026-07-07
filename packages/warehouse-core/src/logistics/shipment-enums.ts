/**
 * Lifecycle of a shipment (expedición). A shipment is the WORK of moving cargo
 * between two resource nodes; the status machine is:
 *
 *   planned ──assign──▶ assigned ──in_transit──▶ in_transit ──deliver──▶ delivered
 *      │                   │
 *      └──────cancel───────┴──▶ cancelled
 *                                in_transit ──fail──▶ failed
 *
 * `planned` when created (no carrier yet); `assigned` once a TransportCapacity
 * and/or carrier is earmarked; `in_transit` while the cargo moves; `delivered`
 * on confirmed reception (emits ShipmentDelivered); `failed` when a started run
 * could not be completed; `cancelled` when called off before transit.
 */
export enum ShipmentStatus {
  Planned = 'planned',
  Assigned = 'assigned',
  InTransit = 'in_transit',
  Delivered = 'delivered',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

/**
 * Who physically carries the shipment. Polymorphic by design (mirrors how
 * grants model their principal and how a TransportCapacity models its
 * provider): a carrier can be a volunteer with a vehicle or a transport
 * organization, with no FK to either table. Optional on a Shipment — an
 * internal inventory transfer has no carrier (#106 key decision).
 */
export enum CarrierType {
  Volunteer = 'volunteer',
  Organization = 'organization',
}

export function isShipmentStatus(value: string): value is ShipmentStatus {
  return (Object.values(ShipmentStatus) as string[]).includes(value);
}

export function isCarrierType(value: string): value is CarrierType {
  return (Object.values(CarrierType) as string[]).includes(value);
}
