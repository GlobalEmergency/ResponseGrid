import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reserveStock, releaseReservation } from './reservations.js';
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
const OTHER_SCOPE = '99999999-9999-4999-8999-999999999999';
const WAREHOUSE = '22222222-2222-4222-8222-222222222222';
const BIN = '44444444-4444-4444-8444-444444444444';
const OTHER_BIN = '55555555-5555-4555-8555-555555555555';
const SUPPLY = 'AGU-0001';

function item(
  status: StockStatus,
  amount: number,
  overrides?: {
    binId?: string;
    supplyId?: string;
    scope?: string;
    unit?: string;
    lotCode?: string | null;
  },
): StockItem {
  return StockItem.create({
    id: StockItemId.create(),
    scopeId: ScopeId.fromString(overrides?.scope ?? SCOPE),
    warehouseId: WarehouseId.fromString(WAREHOUSE),
    binId: BinId.fromString(overrides?.binId ?? BIN),
    supplyId: overrides?.supplyId ?? SUPPLY,
    lot:
      overrides && 'lotCode' in overrides
        ? overrides.lotCode === null
          ? null
          : { code: overrides.lotCode }
        : { code: 'L1' },
    quantity: Quantity.of(amount, overrides?.unit ?? 'unit'),
    status,
  });
}

function reserve(from: StockItem, to: StockItem, qty: number) {
  return reserveStock({
    from,
    to,
    quantity: Quantity.of(qty, from.unit),
    movementId: StockMovementId.create(),
    reason: 'pick 42',
  });
}

test('reserveStock produces an available→reserved transfer', () => {
  const from = item(StockStatus.Available, 10);
  const to = item(StockStatus.Reserved, 0);
  const m = reserve(from, to, 4);
  assert.equal(m.kind, MovementKind.Transfer);
  assert.ok(m.fromItemId?.equals(from.id));
  assert.ok(m.toItemId?.equals(to.id));
  assert.ok(m.isTransfer);
});

test('applying a reservation moves quantity without leaving the bin', () => {
  const from = item(StockStatus.Available, 10);
  const to = item(StockStatus.Reserved, 0);
  const m = reserve(from, to, 4);
  applyStockMovement(m, { from, to });
  assert.equal(from.quantity.amount, 6);
  assert.equal(to.quantity.amount, 4);
});

test('releaseReservation is the inverse (reserved→available)', () => {
  const from = item(StockStatus.Reserved, 4);
  const to = item(StockStatus.Available, 6);
  const m = releaseReservation({
    from,
    to,
    quantity: Quantity.of(4, 'unit'),
    movementId: StockMovementId.create(),
  });
  applyStockMovement(m, { from, to });
  assert.equal(from.quantity.amount, 0);
  assert.equal(to.quantity.amount, 10);
});

test('reserving more than available is caught when applied', () => {
  const from = item(StockStatus.Available, 3);
  const to = item(StockStatus.Reserved, 0);
  const m = reserve(from, to, 5);
  assert.throws(() => applyStockMovement(m, { from, to }));
  assert.equal(from.quantity.amount, 3); // untouched
});

test('rejects wrong statuses', () => {
  // reserve requires Available → Reserved
  assert.throws(
    () =>
      reserve(item(StockStatus.Reserved, 5), item(StockStatus.Reserved, 0), 1),
    StockValidationError,
  );
  assert.throws(
    () =>
      reserve(
        item(StockStatus.Available, 5),
        item(StockStatus.Available, 0),
        1,
      ),
    StockValidationError,
  );
  // release requires Reserved → Available
  assert.throws(
    () =>
      releaseReservation({
        from: item(StockStatus.Available, 5),
        to: item(StockStatus.Available, 0),
        quantity: Quantity.of(1, 'unit'),
        movementId: StockMovementId.create(),
      }),
    StockValidationError,
  );
});

test('rejects a pair that differs in more than status', () => {
  const from = item(StockStatus.Available, 10);
  // different bin
  assert.throws(
    () => reserve(from, item(StockStatus.Reserved, 0, { binId: OTHER_BIN }), 1),
    StockValidationError,
  );
  // different product
  assert.throws(
    () =>
      reserve(from, item(StockStatus.Reserved, 0, { supplyId: 'OTR-0002' }), 1),
    StockValidationError,
  );
  // different scope
  assert.throws(
    () =>
      reserve(from, item(StockStatus.Reserved, 0, { scope: OTHER_SCOPE }), 1),
    StockValidationError,
  );
  // different lot
  assert.throws(
    () => reserve(from, item(StockStatus.Reserved, 0, { lotCode: 'L2' }), 1),
    StockValidationError,
  );
});

test('rejects a quantity in a different unit', () => {
  const from = item(StockStatus.Available, 10, { unit: 'unit' });
  const to = item(StockStatus.Reserved, 0, { unit: 'unit' });
  assert.throws(
    () =>
      reserveStock({
        from,
        to,
        quantity: Quantity.of(1, 'kg'),
        movementId: StockMovementId.create(),
      }),
    StockValidationError,
  );
});

test('supports non-lot-tracked stock (both lots null)', () => {
  const from = item(StockStatus.Available, 5, { lotCode: null });
  const to = item(StockStatus.Reserved, 0, { lotCode: null });
  const m = reserve(from, to, 2);
  applyStockMovement(m, { from, to });
  assert.equal(from.quantity.amount, 3);
  assert.equal(to.quantity.amount, 2);
});
