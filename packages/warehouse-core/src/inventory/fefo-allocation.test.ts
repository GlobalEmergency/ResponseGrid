import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allocateFefo } from './fefo-allocation.js';
import { StockItem } from './stock-item.js';
import { StockItemId } from './stock-item-id.js';
import { WarehouseId } from './warehouse-id.js';
import { Quantity } from './quantity.js';
import { StockStatus } from './stock-enums.js';
import { ScopeId } from '../kernel/scope-id.js';

const SCOPE = '11111111-1111-4111-8111-111111111111';
const OTHER_SCOPE = '99999999-9999-4999-8999-999999999999';
const WH_A = '22222222-2222-4222-8222-222222222222';
const WH_B = '33333333-3333-4333-8333-333333333333';
const BIN = '44444444-4444-4444-8444-444444444444';
const SUPPLY = 'AGU-0001';

let seq = 0;

// Build via fromSnapshot so expiresAt / createdAt / id are fully controlled.
function item(opts: {
  amount: number;
  expiresAt?: string | null;
  createdAt?: string;
  supplyId?: string;
  scope?: string;
  warehouseId?: string;
  unit?: string;
  id?: string;
}): StockItem {
  seq += 1;
  const lotCode = opts.expiresAt === undefined ? 'L' + seq : 'L' + seq;
  return StockItem.fromSnapshot({
    id: opts.id ?? `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
    scopeId: opts.scope ?? SCOPE,
    warehouseId: opts.warehouseId ?? WH_A,
    binId: BIN,
    supplyId: opts.supplyId ?? SUPPLY,
    lotCode,
    expiresAt:
      opts.expiresAt === undefined || opts.expiresAt === null
        ? null
        : new Date(opts.expiresAt),
    quantityAmount: opts.amount,
    unit: opts.unit ?? 'unit',
    status: StockStatus.Available,
    version: 1,
    createdAt: new Date(opts.createdAt ?? '2026-01-01T00:00:00.000Z'),
    updatedAt: new Date(opts.createdAt ?? '2026-01-01T00:00:00.000Z'),
  });
}

function demand(amount: number, unit = 'unit', warehouseId?: string) {
  return {
    scopeId: ScopeId.fromString(SCOPE),
    supplyId: SUPPLY,
    quantity: Quantity.of(amount, unit),
    ...(warehouseId
      ? { warehouseId: WarehouseId.fromString(warehouseId) }
      : {}),
  };
}

test('draws from the earliest-expiring stock first', () => {
  const soon = item({ amount: 10, expiresAt: '2026-03-01T00:00:00Z' });
  const later = item({ amount: 10, expiresAt: '2026-09-01T00:00:00Z' });
  const plan = allocateFefo(demand(5), [later, soon]);
  assert.ok(plan.fullyAllocated);
  assert.equal(plan.lines.length, 1);
  assert.equal(plan.lines[0]!.item.id.value, soon.id.value);
  assert.equal(plan.lines[0]!.quantity.amount, 5);
  assert.equal(plan.allocated.amount, 5);
  assert.equal(plan.shortfall.amount, 0);
});

test('spans multiple lots in expiry order, splitting the last draw', () => {
  const a = item({ amount: 4, expiresAt: '2026-03-01T00:00:00Z' });
  const b = item({ amount: 4, expiresAt: '2026-06-01T00:00:00Z' });
  const c = item({ amount: 4, expiresAt: '2026-09-01T00:00:00Z' });
  const plan = allocateFefo(demand(10), [c, b, a]);
  assert.ok(plan.fullyAllocated);
  assert.deepEqual(
    plan.lines.map((l) => [l.item.id.value, l.quantity.amount]),
    [
      [a.id.value, 4],
      [b.id.value, 4],
      [c.id.value, 2],
    ],
  );
});

test('never-expiring stock is used last', () => {
  const noExpiry = item({ amount: 10, expiresAt: null });
  const expiring = item({ amount: 3, expiresAt: '2026-05-01T00:00:00Z' });
  const plan = allocateFefo(demand(5), [noExpiry, expiring]);
  assert.equal(plan.lines[0]!.item.id.value, expiring.id.value);
  assert.equal(plan.lines[0]!.quantity.amount, 3);
  assert.equal(plan.lines[1]!.item.id.value, noExpiry.id.value);
  assert.equal(plan.lines[1]!.quantity.amount, 2);
});

test('reports a shortfall when stock is insufficient', () => {
  const only = item({ amount: 3, expiresAt: '2026-05-01T00:00:00Z' });
  const plan = allocateFefo(demand(10), [only]);
  assert.equal(plan.fullyAllocated, false);
  assert.equal(plan.allocated.amount, 3);
  assert.equal(plan.shortfall.amount, 7);
  assert.equal(plan.lines.length, 1);
});

test('ties on expiry break by createdAt (oldest first)', () => {
  const newer = item({
    amount: 5,
    expiresAt: '2026-05-01T00:00:00Z',
    createdAt: '2026-02-01T00:00:00Z',
  });
  const older = item({
    amount: 5,
    expiresAt: '2026-05-01T00:00:00Z',
    createdAt: '2026-01-01T00:00:00Z',
  });
  const plan = allocateFefo(demand(3), [newer, older]);
  assert.equal(plan.lines[0]!.item.id.value, older.id.value);
});

test('filters out other scopes, products, units, warehouses and empty items', () => {
  const wrongScope = item({ amount: 10, scope: OTHER_SCOPE });
  const wrongSupply = item({ amount: 10, supplyId: 'OTR-0002' });
  const wrongUnit = item({ amount: 10, unit: 'kg' });
  const empty = item({ amount: 0, expiresAt: '2026-02-01T00:00:00Z' });
  const good = item({ amount: 6, expiresAt: '2026-03-01T00:00:00Z' });
  const plan = allocateFefo(demand(6), [
    wrongScope,
    wrongSupply,
    wrongUnit,
    empty,
    good,
  ]);
  assert.ok(plan.fullyAllocated);
  assert.equal(plan.lines.length, 1);
  assert.equal(plan.lines[0]!.item.id.value, good.id.value);
});

test('restricts to a warehouse when the demand names one', () => {
  const inA = item({
    amount: 5,
    warehouseId: WH_A,
    expiresAt: '2026-03-01T00:00:00Z',
  });
  const inB = item({
    amount: 5,
    warehouseId: WH_B,
    expiresAt: '2026-02-01T00:00:00Z',
  });
  const plan = allocateFefo(demand(5, 'unit', WH_A), [inB, inA]);
  assert.ok(plan.fullyAllocated);
  assert.equal(plan.lines.length, 1);
  assert.equal(plan.lines[0]!.item.id.value, inA.id.value);
});

test('asOf excludes expired lots from allocation', () => {
  const expired = item({ amount: 10, expiresAt: '2026-01-01T00:00:00Z' });
  const fresh = item({ amount: 10, expiresAt: '2026-12-01T00:00:00Z' });
  const plan = allocateFefo(demand(4), [expired, fresh], {
    asOf: new Date('2026-06-01T00:00:00Z'),
  });
  assert.ok(plan.fullyAllocated);
  assert.equal(plan.lines[0]!.item.id.value, fresh.id.value);
});

test('empty candidate set yields a full shortfall', () => {
  const plan = allocateFefo(demand(5), []);
  assert.equal(plan.fullyAllocated, false);
  assert.equal(plan.allocated.amount, 0);
  assert.equal(plan.shortfall.amount, 5);
  assert.deepEqual(plan.lines, []);
});

test('exact match allocates fully with no shortfall', () => {
  const a = item({ amount: 2, expiresAt: '2026-03-01T00:00:00Z' });
  const b = item({ amount: 3, expiresAt: '2026-04-01T00:00:00Z' });
  const plan = allocateFefo(demand(5), [a, b]);
  assert.ok(plan.fullyAllocated);
  assert.equal(plan.allocated.amount, 5);
  assert.equal(plan.shortfall.amount, 0);
  assert.equal(plan.lines.length, 2);
});
