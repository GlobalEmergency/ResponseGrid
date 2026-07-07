import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StockItem } from './stock-item.js';
import { StockItemId } from './stock-item-id.js';
import { WarehouseId } from './warehouse-id.js';
import { BinId } from './bin-id.js';
import { Quantity } from './quantity.js';
import { StockStatus } from './stock-enums.js';
import {
  InsufficientStockError,
  StockValidationError,
} from './stock-errors.js';
import { ScopeId } from '../kernel/scope-id.js';

const SCOPE = '11111111-1111-4111-8111-111111111111';
const WAREHOUSE = '22222222-2222-4222-8222-222222222222';
const BIN = '44444444-4444-4444-8444-444444444444';
const SUPPLY = 'AGU-0001';
const EXPIRY = new Date('2027-01-01T00:00:00.000Z');

function make(
  overrides?: Partial<{
    supplyId: string;
    lot: { code: string; expiresAt?: Date | null } | null;
    quantity: Quantity;
    status: StockStatus;
  }>,
): StockItem {
  return StockItem.create({
    id: StockItemId.create(),
    scopeId: ScopeId.fromString(SCOPE),
    warehouseId: WarehouseId.fromString(WAREHOUSE),
    binId: BinId.fromString(BIN),
    supplyId: overrides?.supplyId ?? SUPPLY,
    lot:
      overrides && 'lot' in overrides
        ? overrides.lot
        : { code: 'L-2026-07', expiresAt: EXPIRY },
    quantity: overrides?.quantity ?? Quantity.of(100, 'unit'),
    status: overrides?.status ?? StockStatus.Available,
  });
}

test('creates stock at version 1 with its grain and lot', () => {
  const s = make();
  assert.equal(s.version, 1);
  assert.equal(s.status, StockStatus.Available);
  assert.equal(s.supplyId, SUPPLY);
  assert.equal(s.quantity.amount, 100);
  assert.equal(s.unit, 'unit');
  assert.equal(s.lot?.code, 'L-2026-07');
  assert.deepEqual(s.expiresAt, EXPIRY);
});

test('rejects an empty supplyId', () => {
  assert.throws(() => make({ supplyId: '   ' }), StockValidationError);
});

test('supports non-lot-tracked stock (no lot)', () => {
  const s = make({ lot: null });
  assert.equal(s.lot, null);
  assert.equal(s.expiresAt, null);
  assert.equal(s.isExpiredAt(new Date('2030-01-01T00:00:00Z')), false);
});

test('increase adds quantity and bumps the version', () => {
  const s = make({ quantity: Quantity.of(10, 'kg') });
  s.increase(Quantity.of(2.5, 'kg'));
  assert.equal(s.quantity.amount, 12.5);
  assert.equal(s.version, 2);
});

test('decrease removes quantity, bumps version, and guards against going negative', () => {
  const s = make({ quantity: Quantity.of(5, 'unit') });
  s.decrease(Quantity.of(3, 'unit'));
  assert.equal(s.quantity.amount, 2);
  assert.equal(s.version, 2);
  assert.throws(
    () => s.decrease(Quantity.of(10, 'unit')),
    InsufficientStockError,
  );
  // rejected mutation left state untouched
  assert.equal(s.quantity.amount, 2);
  assert.equal(s.version, 2);
});

test('mutations across a different unit are rejected', () => {
  const s = make({ quantity: Quantity.of(5, 'unit') });
  assert.throws(() => s.increase(Quantity.of(1, 'kg')));
  assert.throws(() => s.decrease(Quantity.of(1, 'kg')));
  assert.throws(() => s.adjustTo(Quantity.of(1, 'kg')), StockValidationError);
});

test('adjustTo sets an absolute quantity (cycle count)', () => {
  const s = make({ quantity: Quantity.of(5, 'unit') });
  s.adjustTo(Quantity.of(7, 'unit'));
  assert.equal(s.quantity.amount, 7);
  assert.equal(s.version, 2);
});

test('isExpiredAt reflects the lot expiry', () => {
  const s = make({ lot: { code: 'L1', expiresAt: EXPIRY } });
  assert.equal(s.isExpiredAt(new Date('2026-12-31T00:00:00Z')), false);
  assert.equal(s.isExpiredAt(new Date('2027-06-01T00:00:00Z')), true);
});

test('round-trips through a snapshot preserving version and grain', () => {
  const s = make({ quantity: Quantity.of(42.5, 'l') });
  s.increase(Quantity.of(7.5, 'l')); // version → 2
  const snap = s.toSnapshot();
  const restored = StockItem.fromSnapshot(snap);
  assert.deepEqual(restored.toSnapshot(), snap);
  assert.ok(restored instanceof StockItem);
  assert.equal(restored.version, 2);
  assert.equal(restored.quantity.amount, 50);
});
