/**
 * What kind of trackable packaging unit a {@link Container} is. A `pallet`
 * groups boxes/lines, a `box` (caja) groups lines and usually rides a pallet,
 * a `lote` is a logical batch. The taxonomy is intentionally small; the
 * composition is by reference (`parentContainerId`), so any type can hold any
 * other — the type is descriptive, not a structural constraint.
 */
export enum ContainerType {
  Pallet = 'pallet',
  Box = 'box',
  Lote = 'lote',
}

/**
 * Packing lifecycle. `open` while it is being filled; `sealed` (precintado)
 * once closed — its lines become immutable. The "in transit / delivered"
 * stages are NOT modelled here: a sealed container inherits them from the
 * {@link Shipment} it is loaded onto (its holder).
 */
export enum ContainerStatus {
  Open = 'open',
  Sealed = 'sealed',
}

/**
 * Where a container physically is *right now*. `resource` = parked at a
 * collection point / warehouse (becomes that place's inventory); `shipment` =
 * loaded onto an expedition. Polymorphic by design (no FK), mirroring how a
 * shipment models its carrier. Null when it is held by neither.
 */
export enum ContainerHolderType {
  Resource = 'resource',
  Shipment = 'shipment',
}
