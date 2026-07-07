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

/**
 * Lifecycle of a {@link Bin} (ubicación física). `active` = usable for storage
 * and picking; `blocked` = temporarily out of service (damaged shelf, spill,
 * maintenance) — it keeps its stock but accepts no new put-aways and is skipped
 * by allocation; `archived` = permanently retired. `blocked` is the reversible
 * middle state a warehouse operator toggles day to day.
 */
export enum BinStatus {
  Active = 'active',
  Blocked = 'blocked',
  Archived = 'archived',
}

/**
 * Physical type of a {@link Bin} — finer than the {@link ZoneKind} of the area
 * it sits in. `shelf` is a discrete racked location, `bulk` a floor/palletized
 * spot, `staging` a marshalling square (recepción/expedición), `dock` a loading
 * door, `quarantine` an isolation hold. Descriptive; put-away/pick rules read it
 * but the aggregate does not constrain flows on it.
 */
export enum BinKind {
  Shelf = 'shelf',
  Bulk = 'bulk',
  Staging = 'staging',
  Dock = 'dock',
  Quarantine = 'quarantine',
}
