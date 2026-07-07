import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Warehouse, Zone } from './warehouse.js';
import { WarehouseId } from './warehouse-id.js';
import { ZoneId } from './zone-id.js';
import { WarehouseStatus, ZoneKind, ZoneStatus } from './inventory-enums.js';
import {
  DuplicateZoneCodeError,
  WarehouseArchivedError,
  WarehouseValidationError,
} from './inventory-errors.js';
import { ScopeId } from '../kernel/scope-id.js';

const SCOPE = '11111111-1111-4111-8111-111111111111';

function make(
  overrides?: Partial<{
    code: string;
    name: string;
    address: string | null;
    geo: { lat: number | null; lng: number | null } | null;
    zones: { id: ZoneId; code: string; name: string; kind: ZoneKind }[];
  }>,
): Warehouse {
  return Warehouse.create({
    id: WarehouseId.create(),
    scopeId: ScopeId.fromString(SCOPE),
    code: overrides?.code ?? 'ALM-CENTRAL',
    name: overrides?.name ?? 'Almacén Central',
    address: overrides?.address ?? 'Calle Mayor 1',
    geo:
      overrides && 'geo' in overrides
        ? overrides.geo
        : { lat: 10.5, lng: -66.9 },
    ...(overrides?.zones ? { zones: overrides.zones } : {}),
  });
}

test('creates an active warehouse with no zones and normalized fields', () => {
  const w = make({ code: '  ALM-1  ', name: '  Norte  ', address: '  ' });
  assert.equal(w.status, WarehouseStatus.Active);
  assert.equal(w.code, 'ALM-1');
  assert.equal(w.name, 'Norte');
  assert.equal(w.address, null);
  assert.deepEqual(w.zones, []);
  assert.ok(w.scopeId.equals(ScopeId.fromString(SCOPE)));
});

test('rejects empty code and empty name', () => {
  assert.throws(() => make({ code: '   ' }), WarehouseValidationError);
  assert.throws(() => make({ name: '' }), WarehouseValidationError);
});

test('rejects a code longer than 32 chars', () => {
  assert.throws(() => make({ code: 'X'.repeat(33) }), WarehouseValidationError);
});

test('requires both lat and lng or neither, and validates ranges', () => {
  assert.throws(
    () => make({ geo: { lat: 10, lng: null } }),
    WarehouseValidationError,
  );
  assert.throws(
    () => make({ geo: { lat: 91, lng: 0 } }),
    WarehouseValidationError,
  );
  assert.throws(
    () => make({ geo: { lat: 0, lng: 181 } }),
    WarehouseValidationError,
  );
  const w = make({ geo: null });
  assert.deepEqual(w.geo, { lat: null, lng: null });
});

test('adds a zone and exposes it as an active entity', () => {
  const w = make();
  const zone = w.addZone({
    id: ZoneId.create(),
    code: 'REC',
    name: 'Recepción',
    kind: ZoneKind.Receiving,
  });
  assert.equal(zone.status, ZoneStatus.Active);
  assert.equal(w.zones.length, 1);
  assert.equal(w.zones[0]!.code, 'REC');
  assert.equal(w.zones[0]!.kind, ZoneKind.Receiving);
});

test('rejects a duplicate active zone code', () => {
  const w = make();
  w.addZone({
    id: ZoneId.create(),
    code: 'STO',
    name: 'Almacenaje',
    kind: ZoneKind.Storage,
  });
  assert.throws(
    () =>
      w.addZone({
        id: ZoneId.create(),
        code: 'STO',
        name: 'Otra',
        kind: ZoneKind.Storage,
      }),
    DuplicateZoneCodeError,
  );
});

test('rejects duplicate zone codes at creation time', () => {
  assert.throws(
    () =>
      make({
        zones: [
          { id: ZoneId.create(), code: 'A', name: 'A', kind: ZoneKind.Storage },
          { id: ZoneId.create(), code: 'A', name: 'B', kind: ZoneKind.Picking },
        ],
      }),
    DuplicateZoneCodeError,
  );
});

test('lets an archived zone code be reused by a new active zone', () => {
  const w = make();
  const zoneId = ZoneId.create();
  w.addZone({
    id: zoneId,
    code: 'DOCK',
    name: 'Muelle',
    kind: ZoneKind.Shipping,
  });
  w.archiveZone(zoneId);
  // reusing the archived code is allowed (uniqueness is over active zones)
  const reused = w.addZone({
    id: ZoneId.create(),
    code: 'DOCK',
    name: 'Muelle 2',
    kind: ZoneKind.Shipping,
  });
  assert.equal(reused.code, 'DOCK');
});

test('renames a zone and rejects renaming an archived zone', () => {
  const w = make();
  const zoneId = ZoneId.create();
  w.addZone({
    id: zoneId,
    code: 'Q',
    name: 'Cuarentena',
    kind: ZoneKind.Quarantine,
  });
  w.renameZone(zoneId, 'Cuarentena A');
  assert.equal(w.zones[0]!.name, 'Cuarentena A');
  w.archiveZone(zoneId);
  assert.throws(() => w.renameZone(zoneId, 'X'), WarehouseArchivedError);
});

test('throws when addressing an unknown zone', () => {
  const w = make();
  assert.throws(
    () => w.renameZone(ZoneId.create(), 'X'),
    WarehouseValidationError,
  );
});

test('archiving the warehouse freezes all mutations', () => {
  const w = make();
  w.archive();
  assert.equal(w.status, WarehouseStatus.Archived);
  assert.throws(() => w.rename('Nuevo'), WarehouseArchivedError);
  assert.throws(
    () =>
      w.addZone({
        id: ZoneId.create(),
        code: 'Z',
        name: 'Z',
        kind: ZoneKind.Storage,
      }),
    WarehouseArchivedError,
  );
  // archive is idempotent
  assert.doesNotThrow(() => w.archive());
});

test('rename and relocate update the fields', () => {
  const w = make();
  w.rename('  Almacén Sur  ');
  assert.equal(w.name, 'Almacén Sur');
  w.relocate('Nueva dirección', { lat: 40.4, lng: -3.7 });
  assert.equal(w.address, 'Nueva dirección');
  assert.deepEqual(w.geo, { lat: 40.4, lng: -3.7 });
});

test('round-trips through a snapshot', () => {
  const w = make();
  w.addZone({
    id: ZoneId.create(),
    code: 'REC',
    name: 'Recepción',
    kind: ZoneKind.Receiving,
  });
  const snap = w.toSnapshot();
  const restored = Warehouse.fromSnapshot(snap);
  assert.deepEqual(restored.toSnapshot(), snap);
  assert.ok(restored instanceof Warehouse);
  assert.ok(restored.zones[0] instanceof Zone);
});
