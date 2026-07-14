import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildVehicleManifest } from './vehicle-manifest.js';
import type { SupplyLoadInfo, SupplyLoadLookup } from './compute-load.js';

const CAT = new Map<string, SupplyLoadInfo>([
  [
    'water',
    {
      unitWeightKg: 1.5,
      unitVolumeM3: 0.0016,
      defaultUnit: 'und',
      nature: 'fungible',
    },
  ],
  [
    'medic',
    {
      unitWeightKg: null,
      unitVolumeM3: null,
      defaultUnit: 'und',
      nature: 'human',
    },
  ],
]);
const lookup: SupplyLoadLookup = (id) => CAT.get(id) ?? null;

test('agrega el cargo por supplyId sumando suelto + líneas de container', () => {
  const m = buildVehicleManifest(
    [{ supplyId: 'water', quantity: 10, unit: 'und', ref: 'L1' }],
    [
      {
        id: 'BOX-1',
        parentId: null,
        grossWeightKg: null,
        grossVolumeM3: null,
        lines: [{ supplyId: 'water', quantity: 5, unit: 'und', ref: 'L2' }],
      },
    ],
    lookup,
    { weightKg: 1000, volumeM3: null },
  );
  assert.deepEqual(m.cargo, [{ supplyId: 'water', quantity: 15, unit: 'und' }]);
  assert.equal(m.totals.weightKg, 22.5); // 15 × 1.5
  assert.equal(m.status.weightUtilizationPct, 2.3);
});

test('el personal va aparte, no en el cargo', () => {
  const m = buildVehicleManifest(
    [{ supplyId: 'medic', quantity: 3, unit: 'und', ref: 'P1' }],
    [],
    lookup,
    null,
  );
  assert.deepEqual(m.cargo, []);
  assert.equal(m.personnel.length, 1);
  assert.equal(m.personnel[0]!.quantity, 3);
});

test('líneas sin supplyId no entran en el cargo (pero cuentan como incompletas en totals)', () => {
  const m = buildVehicleManifest(
    [{ supplyId: null, quantity: 2, unit: null, ref: 'X' }],
    [],
    lookup,
    null,
  );
  assert.deepEqual(m.cargo, []);
  assert.equal(m.totals.complete, false);
});

test('el mismo supplyId con unidades distintas se agrega por (supplyId, unit)', () => {
  const m = buildVehicleManifest(
    [
      { supplyId: 'water', quantity: 2, unit: 'und', ref: 'a' },
      { supplyId: 'water', quantity: 1, unit: 'palet', ref: 'b' },
    ],
    [],
    lookup,
    null,
  );
  assert.equal(m.cargo.length, 2);
});
