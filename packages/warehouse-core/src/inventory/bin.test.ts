import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Bin } from './bin.js';
import { BinId } from './bin-id.js';
import { WarehouseId } from './warehouse-id.js';
import { ZoneId } from './zone-id.js';
import { BinKind, BinStatus } from './inventory-enums.js';
import { BinArchivedError, BinValidationError } from './inventory-errors.js';
import { ScopeId } from '../kernel/scope-id.js';

const SCOPE = '11111111-1111-4111-8111-111111111111';
const WAREHOUSE = '22222222-2222-4222-8222-222222222222';
const ZONE = '33333333-3333-4333-8333-333333333333';

function make(
  overrides?: Partial<{
    code: string;
    kind: BinKind;
    zoneId: ZoneId | null;
  }>,
): Bin {
  return Bin.create({
    id: BinId.create(),
    scopeId: ScopeId.fromString(SCOPE),
    warehouseId: WarehouseId.fromString(WAREHOUSE),
    zoneId:
      overrides && 'zoneId' in overrides
        ? overrides.zoneId
        : ZoneId.fromString(ZONE),
    code: overrides?.code ?? 'A-01-01',
    kind: overrides?.kind ?? BinKind.Shelf,
  });
}

test('creates an active bin with a trimmed code and its references', () => {
  const bin = make({ code: '  A-01-02  ' });
  assert.equal(bin.status, BinStatus.Active);
  assert.equal(bin.code, 'A-01-02');
  assert.equal(bin.kind, BinKind.Shelf);
  assert.ok(bin.scopeId.equals(ScopeId.fromString(SCOPE)));
  assert.ok(bin.warehouseId.equals(WarehouseId.fromString(WAREHOUSE)));
  assert.ok(bin.zoneId?.equals(ZoneId.fromString(ZONE)));
});

test('creates a bin detached from any zone', () => {
  const bin = make({ zoneId: null });
  assert.equal(bin.zoneId, null);
});

test('rejects an empty or oversized code', () => {
  assert.throws(() => make({ code: '   ' }), BinValidationError);
  assert.throws(() => make({ code: 'X'.repeat(33) }), BinValidationError);
});

test('reassigns and detaches the zone', () => {
  const bin = make();
  const other = ZoneId.create();
  bin.assignZone(other);
  assert.ok(bin.zoneId?.equals(other));
  bin.assignZone(null);
  assert.equal(bin.zoneId, null);
});

test('blocks and unblocks (both idempotent)', () => {
  const bin = make();
  bin.block();
  assert.equal(bin.status, BinStatus.Blocked);
  assert.doesNotThrow(() => bin.block());
  assert.equal(bin.status, BinStatus.Blocked);
  bin.unblock();
  assert.equal(bin.status, BinStatus.Active);
  assert.doesNotThrow(() => bin.unblock());
  assert.equal(bin.status, BinStatus.Active);
});

test('archiving freezes all mutations and is idempotent', () => {
  const bin = make();
  bin.archive();
  assert.equal(bin.status, BinStatus.Archived);
  assert.throws(() => bin.block(), BinArchivedError);
  assert.throws(() => bin.unblock(), BinArchivedError);
  assert.throws(() => bin.assignZone(ZoneId.create()), BinArchivedError);
  assert.doesNotThrow(() => bin.archive());
});

test('can archive a blocked bin', () => {
  const bin = make();
  bin.block();
  bin.archive();
  assert.equal(bin.status, BinStatus.Archived);
});

test('warehouseId is immutable (no setter, survives a snapshot round-trip)', () => {
  const bin = make({ zoneId: null });
  bin.block();
  const snap = bin.toSnapshot();
  const restored = Bin.fromSnapshot(snap);
  assert.deepEqual(restored.toSnapshot(), snap);
  assert.ok(restored instanceof Bin);
  assert.ok(restored.warehouseId.equals(WarehouseId.fromString(WAREHOUSE)));
  assert.equal(restored.status, BinStatus.Blocked);
  assert.equal(restored.zoneId, null);
});
