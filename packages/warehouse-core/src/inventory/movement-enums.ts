/**
 * Business intent of a {@link StockMovement} — the label on the unified
 * two-leg model. The legs (`from`/`to`) determine the *shape* (inbound if only
 * `to`, outbound if only `from`, transfer if both); `kind` disambiguates intent
 * where the shape alone can't:
 *
 * - `receipt` (entrada) — inbound from outside: a delivery/donation arrives.
 * - `issue` (salida) — outbound to outside: consumption, expedición, baja.
 * - `transfer` (traslado) — internal, both legs set: bin→bin, or a status
 *   change (available→reserved/quarantine) modelled as a move between the two
 *   status-partitioned items of the same product/lot/bin.
 * - `adjustment` (ajuste) — a single-leg correction from a recuento/merma: a
 *   gain (only `to`) or a loss (only `from`) with no external counterpart.
 *
 * Both `receipt` and `adjustment`-gain are inbound; `issue` and
 * `adjustment`-loss are outbound — hence `kind` is stored, not derived.
 */
export enum MovementKind {
  Receipt = 'receipt',
  Issue = 'issue',
  Transfer = 'transfer',
  Adjustment = 'adjustment',
}
