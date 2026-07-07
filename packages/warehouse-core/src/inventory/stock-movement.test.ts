import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StockMovement, applyStockMovement } from './stock-movement.js';
import { StockMovementId } from './stock-movement-id.js';
import { StockItem } from './stock-item.js';
import { StockItemId } from './stock-item-id.js';
import { WarehouseId } from './warehouse-id.js';
import { BinId } from './bin-id.js';
import { Quantity } from './quantity.js';
import { StockStatus } from './stock-enums.js';
import { MovementKind } from './movement-enums.js';
import {
  InsufficientStockError,
  StockMovementValidationError,
} from './stock-errors.js';
import { ScopeId } from '../kernel/scope-id.js';

const SCOPE = '11111111-1111-4111-8111-111111111111';
const OTHER_SCOPE = '99999999-9999-4999-8999-999999999999';
const WAREHOUSE = '22222222-2222-4222-8222-222222222222';
const BIN_A = '44444444-4444-4444-8444-444444444444';
const BIN_B = '55555555-5555-4555-8555-555555555555';
const SUPPLY = 'AGU-0001';

function item(
  binId: string,
  amount: number,
  status: StockStatus = StockStatus.Available,
  scope: string = SCOPE,
): StockItem {
  return StockItem.create({
    id: StockItemId.create(),
    scopeId: ScopeId.fromString(scope),
    warehouseId: WarehouseId.fromString(WAREHOUSE),
    binId: BinId.fromString(binId),
    supplyId: SUPPLY,
    lot: { code: 'L1' },
    quantity: Quantity.of(amount, 'unit'),
    status,
  });
}

function record(
  props: Partial<{
    kind: MovementKind;
    quantity: Quantity;
    fromItemId: StockItemId | null;
    toItemId: StockItemId | null;
    idempotencyKey: string | null;
  }>,
): StockMovement {
  return StockMovement.record({
    id: StockMovementId.create(),
    scopeId: ScopeId.fromString(SCOPE),
    kind: props.kind ?? MovementKind.Receipt,
    quantity: props.quantity ?? Quantity.of(10, 'unit'),
    fromItemId: props.fromItemId ?? null,
    toItemId: props.toItemId ?? null,
    idempotencyKey: props.idempotencyKey ?? null,
  });
}

test('records a receipt (inbound: only a to leg)', () => {
  const to = item(BIN_A, 0);
  const m = record({ kind: MovementKind.Receipt, toItemId: to.id });
  assert.ok(m.isInbound);
  assert.ok(!m.isTransfer);
  assert.equal(m.fromItemId, null);
  assert.ok(m.toItemId?.equals(to.id));
});

test('rejects a zero-quantity movement', () => {
  assert.throws(
    () =>
      record({
        kind: MovementKind.Receipt,
        quantity: Quantity.of(0, 'unit'),
        toItemId: StockItemId.create(),
      }),
    StockMovementValidationError,
  );
});

test('enforces leg shape per kind', () => {
  const a = StockItemId.create();
  const b = StockItemId.create();
  // receipt must not have a from leg
  assert.throws(
    () => record({ kind: MovementKind.Receipt, fromItemId: a, toItemId: b }),
    StockMovementValidationError,
  );
  // issue must have only a from leg
  assert.throws(
    () => record({ kind: MovementKind.Issue, toItemId: b }),
    StockMovementValidationError,
  );
  // transfer needs both legs and they must differ
  assert.throws(
    () => record({ kind: MovementKind.Transfer, fromItemId: a }),
    StockMovementValidationError,
  );
  assert.throws(
    () => record({ kind: MovementKind.Transfer, fromItemId: a, toItemId: a }),
    StockMovementValidationError,
  );
  // adjustment needs exactly one leg
  assert.throws(
    () => record({ kind: MovementKind.Adjustment, fromItemId: a, toItemId: b }),
    StockMovementValidationError,
  );
  assert.throws(
    () => record({ kind: MovementKind.Adjustment }),
    StockMovementValidationError,
  );
});

test('applies a receipt: increases the target only', () => {
  const to = item(BIN_A, 5);
  const m = record({
    kind: MovementKind.Receipt,
    quantity: Quantity.of(3, 'unit'),
    toItemId: to.id,
  });
  applyStockMovement(m, { to });
  assert.equal(to.quantity.amount, 8);
});

test('applies an issue: decreases the source only', () => {
  const from = item(BIN_A, 5);
  const m = record({
    kind: MovementKind.Issue,
    quantity: Quantity.of(2, 'unit'),
    fromItemId: from.id,
  });
  applyStockMovement(m, { from });
  assert.equal(from.quantity.amount, 3);
});

test('applies a transfer: conserves quantity across both legs', () => {
  const from = item(BIN_A, 10);
  const to = item(BIN_B, 0);
  const m = record({
    kind: MovementKind.Transfer,
    quantity: Quantity.of(4, 'unit'),
    fromItemId: from.id,
    toItemId: to.id,
  });
  applyStockMovement(m, { from, to });
  assert.equal(from.quantity.amount, 6);
  assert.equal(to.quantity.amount, 4);
});

test('an insufficient transfer aborts before touching the target', () => {
  const from = item(BIN_A, 1);
  const to = item(BIN_B, 0);
  const m = record({
    kind: MovementKind.Transfer,
    quantity: Quantity.of(5, 'unit'),
    fromItemId: from.id,
    toItemId: to.id,
  });
  assert.throws(
    () => applyStockMovement(m, { from, to }),
    InsufficientStockError,
  );
  assert.equal(from.quantity.amount, 1); // untouched
  assert.equal(to.quantity.amount, 0); // never increased
});

test('rejects legs that do not match the movement (missing, wrong id, wrong scope)', () => {
  const to = item(BIN_A, 0);
  const m = record({ kind: MovementKind.Receipt, toItemId: to.id });
  // missing required leg
  assert.throws(() => applyStockMovement(m, {}), StockMovementValidationError);
  // wrong item id
  assert.throws(
    () => applyStockMovement(m, { to: item(BIN_A, 0) }),
    StockMovementValidationError,
  );
  // providing a source to an inbound movement
  const from = item(BIN_B, 0);
  const m2 = record({ kind: MovementKind.Receipt, toItemId: to.id });
  assert.throws(
    () => applyStockMovement(m2, { from, to }),
    StockMovementValidationError,
  );
});

test('rejects a leg item from a different scope', () => {
  const to = item(BIN_A, 0, StockStatus.Available, OTHER_SCOPE);
  const m = StockMovement.record({
    id: StockMovementId.create(),
    scopeId: ScopeId.fromString(SCOPE),
    kind: MovementKind.Receipt,
    quantity: Quantity.of(1, 'unit'),
    toItemId: to.id,
  });
  assert.throws(
    () => applyStockMovement(m, { to }),
    StockMovementValidationError,
  );
});

test('normalizes reason/idempotencyKey and round-trips through a snapshot', () => {
  const to = item(BIN_A, 0);
  const m = StockMovement.record({
    id: StockMovementId.create(),
    scopeId: ScopeId.fromString(SCOPE),
    kind: MovementKind.Receipt,
    quantity: Quantity.of(12.5, 'kg'),
    toItemId: to.id,
    reason: '  albarán 42  ',
    idempotencyKey: '  key-abc  ',
    occurredAt: new Date('2026-07-07T10:00:00.000Z'),
  });
  assert.equal(m.reason, 'albarán 42');
  assert.equal(m.idempotencyKey, 'key-abc');
  const snap = m.toSnapshot();
  const restored = StockMovement.fromSnapshot(snap);
  assert.deepEqual(restored.toSnapshot(), snap);
  assert.ok(restored instanceof StockMovement);
});
