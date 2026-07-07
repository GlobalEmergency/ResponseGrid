/**
 * Lifecycle of a {@link Warehouse}. `active` while in use; `archived` once
 * decommissioned — an archived warehouse keeps its history (and its bins/stock
 * for the record) but accepts no new zones and is hidden from the operational
 * pickers. Deliberately binary: a WMS warehouse is either operating or retired.
 */
export enum WarehouseStatus {
  Active = 'active',
  Archived = 'archived',
}

/**
 * Lifecycle of a {@link Zone}. Mirrors the warehouse: `active` or `archived`.
 * Archiving a zone (e.g. a bay taken out of service) keeps its id valid for
 * historical references while removing it from the operational layout.
 */
export enum ZoneStatus {
  Active = 'active',
  Archived = 'archived',
}

/**
 * Functional role of a {@link Zone} within the warehouse — the coarse WMS
 * layout. `receiving` (recepción) takes inbound goods, `storage` (almacenaje)
 * holds them, `picking` is the pick face, `shipping` (expedición) stages
 * outbound, and `quarantine` (cuarentena) isolates damaged/expired/held stock.
 * Descriptive, not a hard routing constraint — flows are enforced elsewhere.
 */
export enum ZoneKind {
  Receiving = 'receiving',
  Storage = 'storage',
  Picking = 'picking',
  Shipping = 'shipping',
  Quarantine = 'quarantine',
}
