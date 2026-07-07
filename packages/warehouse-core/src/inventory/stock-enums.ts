/**
 * Disposition of a {@link StockItem} — part of its grain, so the same
 * product/lot/bin can hold quantity in several statuses at once, and moving
 * stock between statuses is a transfer between two items (decrease one,
 * increase the other), recorded by a movement.
 *
 * `available` is free to allocate; `reserved` is committed to an order/pick but
 * still physically present; `quarantine` (cuarentena) is held pending
 * inspection/return; `damaged` (dañado) is unsellable/unusable. Expiry is NOT a
 * status — it is derived from the lot's `expiresAt` so a single expiry date
 * drives FEFO and reporting without a state transition.
 */
export enum StockStatus {
  Available = 'available',
  Reserved = 'reserved',
  Quarantine = 'quarantine',
  Damaged = 'damaged',
}
