import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  expiryStatusOf,
  findExpired,
  expiringWithin,
  nextToExpire,
} from './expiry.js';
import { StockItem } from './stock-item.js';
import { StockStatus } from './stock-enums.js';

const SCOPE = '11111111-1111-4111-8111-111111111111';
const WAREHOUSE = '22222222-2222-4222-8222-222222222222';
const BIN = '44444444-4444-4444-8444-444444444444';
const SUPPLY = 'AGU-0001';
const ASOF = new Date('2026-07-01T00:00:00.000Z');

let seq = 0;

// Build via fromSnapshot so expiresAt / quantity / id are fully controlled.
function item(opts: {
  expiresAt: string | null;
  amount?: number;
  id?: string;
}): StockItem {
  seq += 1;
  return StockItem.fromSnapshot({
    id: opts.id ?? `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`,
    scopeId: SCOPE,
    warehouseId: WAREHOUSE,
    binId: BIN,
    supplyId: SUPPLY,
    lotCode: opts.expiresAt === null ? null : 'L' + seq,
    expiresAt: opts.expiresAt === null ? null : new Date(opts.expiresAt),
    quantityAmount: opts.amount ?? 10,
    unit: 'unit',
    status: StockStatus.Available,
    version: 1,
    createdAt: ASOF,
    updatedAt: ASOF,
  });
}

const days = (n: number) => ({ asOf: ASOF, withinDays: n });

test('expiryStatusOf classifies no_expiry / expired / near / ok', () => {
  assert.equal(
    expiryStatusOf(item({ expiresAt: null }), { asOf: ASOF }),
    'no_expiry',
  );
  assert.equal(
    expiryStatusOf(item({ expiresAt: '2026-06-01T00:00:00Z' }), { asOf: ASOF }),
    'expired',
  );
  // exactly at asOf counts as expired
  assert.equal(
    expiryStatusOf(item({ expiresAt: '2026-07-01T00:00:00Z' }), { asOf: ASOF }),
    'expired',
  );
  // within default 30-day window
  assert.equal(
    expiryStatusOf(item({ expiresAt: '2026-07-20T00:00:00Z' }), { asOf: ASOF }),
    'near',
  );
  // beyond 30 days
  assert.equal(
    expiryStatusOf(item({ expiresAt: '2026-09-01T00:00:00Z' }), { asOf: ASOF }),
    'ok',
  );
  // custom near window
  assert.equal(
    expiryStatusOf(item({ expiresAt: '2026-07-20T00:00:00Z' }), {
      asOf: ASOF,
      nearWithinDays: 7,
    }),
    'ok',
  );
});

test('findExpired returns only expired (qty>0), earliest first', () => {
  const a = item({ expiresAt: '2026-06-15T00:00:00Z' });
  const b = item({ expiresAt: '2026-05-01T00:00:00Z' });
  const future = item({ expiresAt: '2026-12-01T00:00:00Z' });
  const empty = item({ expiresAt: '2026-01-01T00:00:00Z', amount: 0 });
  const noLot = item({ expiresAt: null });
  const result = findExpired([a, b, future, empty, noLot], ASOF);
  assert.deepEqual(
    result.map((i) => i.id.value),
    [b.id.value, a.id.value],
  );
});

test('expiringWithin excludes already-expired and beyond-window', () => {
  const expired = item({ expiresAt: '2026-06-01T00:00:00Z' });
  const soon = item({ expiresAt: '2026-07-10T00:00:00Z' });
  const soon2 = item({ expiresAt: '2026-07-05T00:00:00Z' });
  const far = item({ expiresAt: '2026-09-01T00:00:00Z' });
  const empty = item({ expiresAt: '2026-07-06T00:00:00Z', amount: 0 });
  const result = expiringWithin([expired, soon, far, soon2, empty], days(30));
  assert.deepEqual(
    result.map((i) => i.id.value),
    [soon2.id.value, soon.id.value],
  );
});

test('expiringWithin includes the exact window boundary', () => {
  const boundary = item({ expiresAt: '2026-07-31T00:00:00Z' }); // exactly +30 days
  const justOver = item({ expiresAt: '2026-08-01T00:00:00Z' });
  const result = expiringWithin([boundary, justOver], days(30));
  assert.deepEqual(
    result.map((i) => i.id.value),
    [boundary.id.value],
  );
});

test('nextToExpire returns the most urgent lot-tracked item (incl. expired)', () => {
  const expired = item({ expiresAt: '2026-05-01T00:00:00Z' });
  const later = item({ expiresAt: '2026-08-01T00:00:00Z' });
  const noLot = item({ expiresAt: null });
  assert.equal(
    nextToExpire([later, noLot, expired])?.id.value,
    expired.id.value,
  );
});

test('nextToExpire returns null when nothing is lot-tracked or all empty', () => {
  assert.equal(nextToExpire([item({ expiresAt: null })]), null);
  assert.equal(
    nextToExpire([item({ expiresAt: '2026-05-01T00:00:00Z', amount: 0 })]),
    null,
  );
  assert.equal(nextToExpire([]), null);
});
