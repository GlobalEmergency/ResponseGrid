import { StockItem } from './stock-item.js';
import { StockMovement } from './stock-movement.js';
import { StockMovementId } from './stock-movement-id.js';
import { Quantity } from './quantity.js';
import { StockStatus } from './stock-enums.js';
import { MovementKind } from './movement-enums.js';
import { StockValidationError } from './stock-errors.js';

export interface ReservationInput {
  /** Source item (Available for a reservation, Reserved for a release). */
  from: StockItem;
  /** Target item — same grain as `from` except its status. */
  to: StockItem;
  quantity: Quantity;
  /** Id for the transfer movement (minted by the caller). */
  movementId: StockMovementId;
  reason?: string | null;
  idempotencyKey?: string | null;
  occurredAt?: Date;
}

/**
 * Reserves stock: commits `quantity` of an **available** item to a **reserved**
 * counterpart of the *same grain* (same product/lot/bin) — the stock stays
 * physically in the bin, only its disposition changes. Returned as a `transfer`
 * {@link StockMovement} that is **not applied** (plan/execute split): the caller
 * runs `applyStockMovement` (which decreases `from` and increases `to`,
 * conserving quantity and guarding non-negativity) and persists.
 */
export function reserveStock(input: ReservationInput): StockMovement {
  return buildStatusTransfer(
    input,
    StockStatus.Available,
    StockStatus.Reserved,
  );
}

/**
 * Releases a reservation: the inverse of {@link reserveStock}, moving
 * `quantity` from a **reserved** item back to its **available** counterpart of
 * the same grain. Returned as a not-yet-applied `transfer` movement.
 */
export function releaseReservation(input: ReservationInput): StockMovement {
  return buildStatusTransfer(
    input,
    StockStatus.Reserved,
    StockStatus.Available,
  );
}

function buildStatusTransfer(
  input: ReservationInput,
  expectedFrom: StockStatus,
  expectedTo: StockStatus,
): StockMovement {
  const { from, to, quantity } = input;

  if (from.status !== expectedFrom) {
    throw new StockValidationError(
      `Reservation source must be ${expectedFrom}, got ${from.status}`,
    );
  }
  if (to.status !== expectedTo) {
    throw new StockValidationError(
      `Reservation target must be ${expectedTo}, got ${to.status}`,
    );
  }
  assertSameGrainExceptStatus(from, to);
  if (quantity.unit !== from.unit) {
    throw new StockValidationError(
      `Reservation quantity unit "${quantity.unit}" does not match the stock unit "${from.unit}"`,
    );
  }

  return StockMovement.record({
    id: input.movementId,
    scopeId: from.scopeId,
    kind: MovementKind.Transfer,
    quantity,
    fromItemId: from.id,
    toItemId: to.id,
    reason: input.reason ?? null,
    idempotencyKey: input.idempotencyKey ?? null,
    ...(input.occurredAt !== undefined ? { occurredAt: input.occurredAt } : {}),
  });
}

/** The two items must be the same grain in everything but status. */
function assertSameGrainExceptStatus(from: StockItem, to: StockItem): void {
  if (!from.scopeId.equals(to.scopeId)) {
    throw new StockValidationError('Reservation items are in different scopes');
  }
  if (from.supplyId !== to.supplyId) {
    throw new StockValidationError(
      'Reservation items are of different products',
    );
  }
  if (!from.binId.equals(to.binId)) {
    throw new StockValidationError('Reservation items are in different bins');
  }
  if (from.unit !== to.unit) {
    throw new StockValidationError(
      'Reservation items have different units of measure',
    );
  }
  if (!sameLot(from, to)) {
    throw new StockValidationError('Reservation items are of different lots');
  }
}

function sameLot(from: StockItem, to: StockItem): boolean {
  if (from.lot === null && to.lot === null) return true;
  if (from.lot === null || to.lot === null) return false;
  return from.lot.equals(to.lot);
}
