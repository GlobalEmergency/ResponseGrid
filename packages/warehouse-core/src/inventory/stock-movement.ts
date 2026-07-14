import { StockMovementId } from './stock-movement-id.js';
import { StockItemId } from './stock-item-id.js';
import { StockItem } from './stock-item.js';
import { Quantity } from './quantity.js';
import { MovementKind } from './movement-enums.js';
import { StockMovementValidationError } from './stock-errors.js';
import { ScopeId } from '../kernel/index.js';

export interface RecordStockMovementProps {
  id: StockMovementId;
  scopeId: ScopeId;
  kind: MovementKind;
  quantity: Quantity;
  /** Source StockItem, or null for an inbound movement (receipt / adjustment-gain). */
  fromItemId?: StockItemId | null;
  /** Target StockItem, or null for an outbound movement (issue / adjustment-loss). */
  toItemId?: StockItemId | null;
  /** Free-text reason / note (recuento, merma, nº de albarán…). */
  reason?: string | null;
  /**
   * Optional idempotency key. The repository enforces it unique per scope, so a
   * retried receipt (same key) is recorded once — the app resolves an existing
   * movement by key before applying, guarding against double entradas.
   */
  idempotencyKey?: string | null;
  /**
   * Quién ejecutó el movimiento (cadena de custodia). Id opaco: el paquete no
   * resuelve identidad ni permisos — eso lo hace el host (#355). Null = sin
   * autor conocido (movimientos históricos o del sistema).
   */
  actorId?: string | null;
  occurredAt?: Date;
}

export interface StockMovementSnapshot {
  id: string;
  scopeId: string;
  kind: MovementKind;
  quantityAmount: number;
  unit: string;
  fromItemId: string | null;
  toItemId: string | null;
  reason: string | null;
  idempotencyKey: string | null;
  actorId: string | null;
  occurredAt: Date;
}

/** The StockItem aggregates a movement's legs refer to, passed to be mutated. */
export interface MovementLegs {
  from?: StockItem | null;
  to?: StockItem | null;
}

/**
 * An immutable line of the stock ledger (kardex) — the **unified two-leg
 * movement** (option A). Every stock change is one record with a `from` leg and
 * a `to` leg, each a {@link StockItem} or the exterior (null):
 *
 * - receipt (entrada): `null → to`
 * - issue (salida): `from → null`
 * - transfer (traslado): `from → to` (bin→bin, or a status change modelled as a
 *   move between the two status-partitioned items)
 * - adjustment (ajuste): a single leg — gain (`null → to`) or loss (`from → null`)
 *
 * The same {@link Quantity} flows out of `from` and into `to`, so conservation
 * is structural: the record is only the *asiento*; {@link applyStockMovement}
 * is the domain service that applies it to the actual StockItem aggregates
 * (decrease one, increase the other), delegating the unit and non-negativity
 * guards to those aggregates. Orchestration (load items, apply, persist all +
 * append the ledger, atomically) is the host's application layer.
 */
export class StockMovement {
  private constructor(
    public readonly id: StockMovementId,
    public readonly scopeId: ScopeId,
    public readonly kind: MovementKind,
    public readonly quantity: Quantity,
    public readonly fromItemId: StockItemId | null,
    public readonly toItemId: StockItemId | null,
    public readonly reason: string | null,
    public readonly idempotencyKey: string | null,
    public readonly actorId: string | null,
    public readonly occurredAt: Date,
  ) {}

  static record(props: RecordStockMovementProps): StockMovement {
    if (props.quantity.isZero()) {
      throw new StockMovementValidationError(
        'Stock movement quantity must be greater than zero',
      );
    }
    const from = props.fromItemId ?? null;
    const to = props.toItemId ?? null;
    assertLegsMatchKind(props.kind, from, to);

    return new StockMovement(
      props.id,
      props.scopeId,
      props.kind,
      props.quantity,
      from,
      to,
      normalizeText(props.reason),
      normalizeText(props.idempotencyKey),
      normalizeText(props.actorId),
      props.occurredAt ?? new Date(),
    );
  }

  static fromSnapshot(s: StockMovementSnapshot): StockMovement {
    return new StockMovement(
      StockMovementId.fromString(s.id),
      ScopeId.fromString(s.scopeId),
      s.kind,
      Quantity.of(s.quantityAmount, s.unit),
      s.fromItemId !== null ? StockItemId.fromString(s.fromItemId) : null,
      s.toItemId !== null ? StockItemId.fromString(s.toItemId) : null,
      s.reason,
      s.idempotencyKey,
      s.actorId,
      s.occurredAt,
    );
  }

  get isInbound(): boolean {
    return this.fromItemId === null;
  }
  get isOutbound(): boolean {
    return this.toItemId === null;
  }
  get isTransfer(): boolean {
    return this.fromItemId !== null && this.toItemId !== null;
  }

  toSnapshot(): StockMovementSnapshot {
    return {
      id: this.id.value,
      scopeId: this.scopeId.value,
      kind: this.kind,
      quantityAmount: this.quantity.amount,
      unit: this.quantity.unit,
      fromItemId: this.fromItemId?.value ?? null,
      toItemId: this.toItemId?.value ?? null,
      reason: this.reason,
      idempotencyKey: this.idempotencyKey,
      actorId: this.actorId,
      occurredAt: this.occurredAt,
    };
  }
}

/**
 * Applies a recorded movement to the StockItem aggregates of its legs: the
 * `from` item is decreased and the `to` item increased by the movement's
 * quantity. The provided items MUST match the movement's leg ids and scope. The
 * `from` leg is applied first, so an {@link InsufficientStockError} aborts the
 * whole move before the target is touched. Unit and non-negativity are enforced
 * by {@link StockItem.decrease}/{@link StockItem.increase}.
 */
export function applyStockMovement(
  movement: StockMovement,
  legs: MovementLegs,
): void {
  const from = legs.from ?? null;
  const to = legs.to ?? null;

  if (movement.fromItemId !== null) {
    if (from === null) {
      throw new StockMovementValidationError(
        `Movement ${movement.id.value} requires its 'from' StockItem`,
      );
    }
    assertItemMatchesLeg(movement, from, movement.fromItemId, 'from');
  } else if (from !== null) {
    throw new StockMovementValidationError(
      `Movement ${movement.id.value} has no 'from' leg but a source item was provided`,
    );
  }

  if (movement.toItemId !== null) {
    if (to === null) {
      throw new StockMovementValidationError(
        `Movement ${movement.id.value} requires its 'to' StockItem`,
      );
    }
    assertItemMatchesLeg(movement, to, movement.toItemId, 'to');
  } else if (to !== null) {
    throw new StockMovementValidationError(
      `Movement ${movement.id.value} has no 'to' leg but a target item was provided`,
    );
  }

  // Decrease the source first: an insufficient-stock error aborts before the
  // target is mutated, keeping the pair consistent.
  if (from !== null) from.decrease(movement.quantity);
  if (to !== null) to.increase(movement.quantity);
}

function assertLegsMatchKind(
  kind: MovementKind,
  from: StockItemId | null,
  to: StockItemId | null,
): void {
  switch (kind) {
    case MovementKind.Receipt:
      if (from !== null || to === null) {
        throw new StockMovementValidationError(
          'A receipt must have only a target (to) leg',
        );
      }
      return;
    case MovementKind.Issue:
      if (from === null || to !== null) {
        throw new StockMovementValidationError(
          'An issue must have only a source (from) leg',
        );
      }
      return;
    case MovementKind.Transfer:
      if (from === null || to === null) {
        throw new StockMovementValidationError(
          'A transfer must have both source and target legs',
        );
      }
      if (from.equals(to)) {
        throw new StockMovementValidationError(
          'A transfer must move between two different StockItems',
        );
      }
      return;
    case MovementKind.Adjustment:
      if ((from === null) === (to === null)) {
        throw new StockMovementValidationError(
          'An adjustment must have exactly one leg (a gain or a loss)',
        );
      }
      return;
  }
}

function assertItemMatchesLeg(
  movement: StockMovement,
  item: StockItem,
  legId: StockItemId,
  leg: 'from' | 'to',
): void {
  if (!item.id.equals(legId)) {
    throw new StockMovementValidationError(
      `Movement ${movement.id.value} '${leg}' item ${item.id.value} does not match leg ${legId.value}`,
    );
  }
  if (!item.scopeId.equals(movement.scopeId)) {
    throw new StockMovementValidationError(
      `Movement ${movement.id.value} '${leg}' item is in a different scope`,
    );
  }
}

function normalizeText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
