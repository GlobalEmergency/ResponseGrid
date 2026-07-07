import { StockItem } from './stock-item.js';
import { StockMovement } from './stock-movement.js';
import { StockMovementId } from './stock-movement-id.js';
import { Quantity } from './quantity.js';
import { MovementKind } from './movement-enums.js';
import { StockValidationError } from './stock-errors.js';

/** Outcome of comparing a physical count with the system quantity. */
export type CountDirection = 'match' | 'gain' | 'loss';

export interface CycleCountInput {
  /** The StockItem being counted (a single grain: product × lot × bin × status). */
  item: StockItem;
  /** The quantity physically found. Must share the item's unit. */
  counted: Quantity;
  /** Id for the adjustment movement (minted by the caller; unused on a match). */
  movementId: StockMovementId;
  /** Free-text note (e.g. "recuento cíclico 2026-07"). */
  reason?: string | null;
  idempotencyKey?: string | null;
  occurredAt?: Date;
}

export interface CycleCountResult {
  direction: CountDirection;
  /** `true` when the count matches the system (no adjustment needed). */
  matched: boolean;
  /** What the system held before the count. */
  systemQuantity: Quantity;
  /** What was physically found. */
  countedQuantity: Quantity;
  /** Magnitude of the discrepancy (zero when matched). */
  variance: Quantity;
  /**
   * The adjustment to apply, or null on a match. It is a recorded but
   * **not-yet-applied** `Adjustment` movement (plan/execute split, like FEFO):
   * a gain is inbound (`null → item`), a loss is outbound (`item → null`).
   * The caller applies it with `applyStockMovement` and persists — after which
   * `item.quantity === counted`.
   */
  movement: StockMovement | null;
}

/**
 * Reconciles a **cycle count** (recuento) of a single {@link StockItem} against
 * its system quantity and produces the {@link StockMovement} of kind
 * `adjustment` that would bring the system in line with what was physically
 * found:
 *
 * - counted **=** system → `match`, no movement.
 * - counted **>** system → `gain`: an inbound adjustment for the surplus.
 * - counted **<** system → `loss`: an outbound adjustment for the shortfall.
 *
 * Pure and deterministic: it does not mutate the item nor apply the movement —
 * it returns the plan. The caller applies it (`applyStockMovement`) and persists
 * the item + appends the asiento atomically. Counting across a different unit is
 * rejected (a recuento can't change the unit of measure).
 */
export function reconcileCount(input: CycleCountInput): CycleCountResult {
  const system = input.item.quantity;
  const counted = input.counted;

  if (counted.unit !== system.unit) {
    throw new StockValidationError(
      `Cannot reconcile a "${system.unit}" StockItem against a "${counted.unit}" count`,
    );
  }

  if (counted.equals(system)) {
    return {
      direction: 'match',
      matched: true,
      systemQuantity: system,
      countedQuantity: counted,
      variance: Quantity.of(0, system.unit),
      movement: null,
    };
  }

  const gain = system.isLessThan(counted);
  const variance = gain ? counted.minus(system) : system.minus(counted);

  const movement = StockMovement.record({
    id: input.movementId,
    scopeId: input.item.scopeId,
    kind: MovementKind.Adjustment,
    quantity: variance,
    fromItemId: gain ? null : input.item.id,
    toItemId: gain ? input.item.id : null,
    reason: input.reason ?? null,
    idempotencyKey: input.idempotencyKey ?? null,
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });

  return {
    direction: gain ? 'gain' : 'loss',
    matched: false,
    systemQuantity: system,
    countedQuantity: counted,
    variance,
    movement,
  };
}
