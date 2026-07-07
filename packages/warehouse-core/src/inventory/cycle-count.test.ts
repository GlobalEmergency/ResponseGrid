import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reconcileCount } from './cycle-count.js';
import { applyStockMovement } from './stock-movement.js';
import { StockMovementId } from './stock-movement-id.js';
import { StockItem } from './stock-item.js';
import { StockItemId } from './stock-item-id.js';
import { WarehouseId } from './warehouse-id.js';
import { BinId } from './bin-id.js';
import { Quantity } from './quantity.js';
import { StockStatus } from './stock-enums.js';
import { MovementKind } from './movement-enums.js';
import { StockValidationError } from './stock-errors.js';
import { ScopeId } from '../kernel/scope-id.js';

const SCOPE = '11111111-1111-4111-8111-111111111111';
const WAREHOUSE = '22222222-2222-4222-8222-222222222222';
const BIN = '44444444-4444-4444-8444-444444444444';
const SUPPLY = 'AGU-0001';

function item(amount: number, unit = 'unit'): StockItem {
  return StockItem.create({
    id: StockItemId.create(),
    scopeId: ScopeId.fromString(SCOPE),
    warehouseId: WarehouseId.fromString(WAREHOUSE),
    binId: BinId.fromString(BIN),
    supplyId: SUPPLY,
    lot: { code: 'L1' },
    quantity: Quantity.of(amount, unit),
    status: StockStatus.Available,
  });
}

function reconcile(it: StockItem, counted: number) {
  return reconcileCount({
    item: it,
    counted: Quantity.of(counted, it.unit),
    movementId: StockMovementId.create(),
    reason: 'recuento',
  });
}

test('match: no adjustment when the count equals the system', () => {
  const r = reconcile(item(10), 10);
  assert.equal(r.direction, 'match');
  assert.ok(r.matched);
  assert.equal(r.variance.amount, 0);
  assert.equal(r.movement, null);
});

test('gain: surplus produces an inbound adjustment (null → item)', () => {
  const it = item(10);
  const r = reconcile(it, 13);
  assert.equal(r.direction, 'gain');
  assert.equal(r.matched, false);
  assert.equal(r.variance.amount, 3);
  assert.ok(r.movement);
  assert.equal(r.movement!.kind, MovementKind.Adjustment);
  assert.equal(r.movement!.fromItemId, null);
  assert.ok(r.movement!.toItemId?.equals(it.id));
  assert.ok(r.movement!.isInbound);
});

test('loss: shortfall produces an outbound adjustment (item → null)', () => {
  const it = item(10);
  const r = reconcile(it, 4);
  assert.equal(r.direction, 'loss');
  assert.equal(r.variance.amount, 6);
  assert.ok(r.movement!.toItemId === null);
  assert.ok(r.movement!.fromItemId?.equals(it.id));
  assert.ok(r.movement!.isOutbound);
});

test('applying a gain adjustment brings the item up to the counted quantity', () => {
  const it = item(10);
  const r = reconcile(it, 13);
  applyStockMovement(r.movement!, { to: it });
  assert.equal(it.quantity.amount, 13);
});

test('applying a loss adjustment brings the item down to the counted quantity', () => {
  const it = item(10);
  const r = reconcile(it, 4);
  applyStockMovement(r.movement!, { from: it });
  assert.equal(it.quantity.amount, 4);
});

test('works with decimal quantities', () => {
  const it = item(2.5, 'kg');
  const r = reconcile(it, 2.75);
  assert.equal(r.direction, 'gain');
  assert.equal(r.variance.amount, 0.25);
  applyStockMovement(r.movement!, { to: it });
  assert.equal(it.quantity.amount, 2.75);
});

test('counting to zero produces a full-loss adjustment', () => {
  const it = item(5);
  const r = reconcile(it, 0);
  assert.equal(r.direction, 'loss');
  assert.equal(r.variance.amount, 5);
  applyStockMovement(r.movement!, { from: it });
  assert.equal(it.quantity.amount, 0);
});

test('rejects a count in a different unit', () => {
  const it = item(5, 'unit');
  assert.throws(
    () =>
      reconcileCount({
        item: it,
        counted: Quantity.of(5, 'kg'),
        movementId: StockMovementId.create(),
      }),
    StockValidationError,
  );
});

test('carries scope, reason and reports system/counted quantities', () => {
  const it = item(10);
  const r = reconcile(it, 12);
  assert.equal(r.systemQuantity.amount, 10);
  assert.equal(r.countedQuantity.amount, 12);
  assert.ok(r.movement!.scopeId.equals(ScopeId.fromString(SCOPE)));
  assert.equal(r.movement!.reason, 'recuento');
});
