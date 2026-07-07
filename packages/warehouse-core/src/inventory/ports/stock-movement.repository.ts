import { StockMovement } from '../stock-movement.js';
import { StockMovementId } from '../stock-movement-id.js';
import { StockItemId } from '../stock-item-id.js';
import { ScopeId } from '../../kernel/index.js';
import { MovementKind } from '../movement-enums.js';

export const STOCK_MOVEMENT_REPOSITORY = Symbol('StockMovementRepository');

/** Filter for listing ledger entries. AND-combined. */
export interface ListMovementsFilter {
  kind?: MovementKind;
  /** Only movements at/after this instant (ISO/Date). */
  occurredFrom?: Date;
  /** Only movements at/before this instant. */
  occurredTo?: Date;
}

export interface StockMovementRepository {
  /**
   * Appends a movement to the ledger. The ledger is immutable — implementations
   * only insert, never update or delete — and MUST enforce `idempotencyKey`
   * unique per scope so a retried entrada is recorded once.
   */
  append(movement: StockMovement): Promise<void>;
  findById(id: StockMovementId): Promise<StockMovement | null>;
  /** Resolves a movement by its idempotency key within a scope, if any. */
  findByIdempotencyKey(
    scopeId: ScopeId,
    idempotencyKey: string,
  ): Promise<StockMovement | null>;
  /** Ledger of a single item (its `from` or `to` legs), newest-first. */
  findByItem(
    itemId: StockItemId,
    filter: ListMovementsFilter,
  ): Promise<StockMovement[]>;
  findByScope(
    scopeId: ScopeId,
    filter: ListMovementsFilter,
  ): Promise<StockMovement[]>;
}
