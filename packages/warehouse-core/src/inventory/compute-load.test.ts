import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeLoad,
  SupplyLoadInfo,
  SupplyLoadLookup,
} from './compute-load.js';

const CATALOG = new Map<string, SupplyLoadInfo>([
  // agua: 1.5 kg y 0.0016 m³ por unidad
  [
    'water',
    {
      unitWeightKg: 1.5,
      unitVolumeM3: 0.0016,
      defaultUnit: 'und',
      nature: 'fungible',
    },
  ],
  // camilla: solo peso conocido
  [
    'stretcher',
    {
      unitWeightKg: 8,
      unitVolumeM3: null,
      defaultUnit: 'und',
      nature: 'reusable',
    },
  ],
  // sanitario: personal, no es carga
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
const lookup: SupplyLoadLookup = (id) => CATALOG.get(id) ?? null;

test('suma peso y volumen de líneas sueltas conocidas (completo)', () => {
  const r = computeLoad(
    [{ supplyId: 'water', quantity: 10, unit: 'und', ref: 'L1' }],
    [],
    lookup,
  );
  assert.equal(r.weightKg, 15);
  assert.equal(r.volumeM3, 0.016);
  assert.equal(r.complete, true);
  assert.deepEqual(r.unknowns, []);
});

test('unit null se asume en la unidad base (defaultUnit)', () => {
  const r = computeLoad(
    [{ supplyId: 'water', quantity: 2, unit: null, ref: 'L1' }],
    [],
    lookup,
  );
  assert.equal(r.weightKg, 3);
  assert.equal(r.complete, true);
});

test('mismatch de unidad → desconocida en ambas dimensiones (no multiplica)', () => {
  const r = computeLoad(
    [{ supplyId: 'water', quantity: 3, unit: 'cajas', ref: 'L1' }],
    [],
    lookup,
  );
  assert.equal(r.weightKg, 0);
  assert.equal(r.complete, false);
  assert.deepEqual(r.unknowns, [
    { ref: 'L1', dimensions: ['weight', 'volume'], reason: 'unit_mismatch' },
  ]);
});

test('insumo sin volumen: pesa pero el volumen queda incompleto (límite inferior)', () => {
  const r = computeLoad(
    [{ supplyId: 'stretcher', quantity: 2, unit: 'und', ref: 'L1' }],
    [],
    lookup,
  );
  assert.equal(r.weightKg, 16);
  assert.equal(r.volumeM3, 0);
  assert.equal(r.weightComplete, true);
  assert.equal(r.volumeComplete, false);
  assert.equal(r.complete, false);
  assert.deepEqual(r.unknowns, [
    { ref: 'L1', dimensions: ['volume'], reason: 'missing_unit_measure' },
  ]);
});

test('supplyId null o no resuelto → desconocido', () => {
  const r = computeLoad(
    [
      { supplyId: null, quantity: 1, unit: null, ref: 'suelto' },
      { supplyId: 'nope', quantity: 1, unit: null, ref: 'L2' },
    ],
    [],
    lookup,
  );
  assert.equal(r.unknowns.length, 2);
  assert.equal(r.unknowns[0]!.reason, 'unknown_supply');
});

test('nature=human se excluye del peso/volumen y se reporta como personal', () => {
  const r = computeLoad(
    [{ supplyId: 'medic', quantity: 4, unit: 'und', ref: 'P1' }],
    [],
    lookup,
  );
  assert.equal(r.weightKg, 0);
  assert.equal(r.complete, true); // el personal no cuenta como dato faltante
  assert.equal(r.personnel.length, 1);
  assert.equal(r.personnel[0]!.quantity, 4);
});

test('container con bruto declarado: cuenta el declarado y sus líneas NO suman', () => {
  const r = computeLoad(
    [],
    [
      {
        id: 'PAL-1',
        parentId: null,
        grossWeightKg: 120,
        grossVolumeM3: 0.5,
        lines: [{ supplyId: 'water', quantity: 999, unit: 'und', ref: 'L' }],
      },
    ],
    lookup,
  );
  assert.equal(r.weightKg, 120);
  assert.equal(r.volumeM3, 0.5);
  assert.equal(r.complete, true);
});

test('container sin declarar deriva de sus líneas (vía catálogo)', () => {
  const r = computeLoad(
    [],
    [
      {
        id: 'BOX-1',
        parentId: null,
        grossWeightKg: null,
        grossVolumeM3: null,
        lines: [{ supplyId: 'water', quantity: 12, unit: null, ref: 'L' }],
      },
    ],
    lookup,
  );
  assert.equal(r.weightKg, 18); // 12 × 1.5
  assert.equal(r.complete, true);
});

test('declarado parcial: el peso declarado corta SU dimensión; el volumen se deriva', () => {
  const r = computeLoad(
    [],
    [
      {
        id: 'PAL-1',
        parentId: null,
        grossWeightKg: 200, // pesado en báscula (incluye tara)
        grossVolumeM3: null,
        lines: [{ supplyId: 'water', quantity: 100, unit: null, ref: 'L' }],
      },
    ],
    lookup,
  );
  assert.equal(r.weightKg, 200); // NO 150: el declarado gana en peso
  assert.equal(r.volumeM3, 0.16); // 100 × 0.0016 derivado
  assert.equal(r.complete, true);
});

test('árbol anidado: el declarado del ancestro gana y corta a los descendientes', () => {
  const r = computeLoad(
    [],
    [
      {
        id: 'PAL-1',
        parentId: null,
        grossWeightKg: 300,
        grossVolumeM3: 1.2,
        lines: [],
      },
      {
        id: 'BOX-1',
        parentId: 'PAL-1',
        grossWeightKg: 50, // se ignora: el palet ya declaró
        grossVolumeM3: null,
        lines: [{ supplyId: 'water', quantity: 10, unit: null, ref: 'L' }],
      },
    ],
    lookup,
  );
  assert.equal(r.weightKg, 300);
  assert.equal(r.volumeM3, 1.2);
});

test('padre desconocido en el conjunto ⇒ el hijo cuenta como raíz (no se pierde)', () => {
  const r = computeLoad(
    [],
    [
      {
        id: 'BOX-9',
        parentId: 'PAL-QUE-NO-VINO',
        grossWeightKg: 10,
        grossVolumeM3: null,
        lines: [],
      },
    ],
    lookup,
  );
  assert.equal(r.weightKg, 10);
});

test('línea no calculable dentro de un container sin declarar → unknown', () => {
  const r = computeLoad(
    [],
    [
      {
        id: 'BOX-1',
        parentId: null,
        grossWeightKg: null,
        grossVolumeM3: null,
        lines: [{ supplyId: null, quantity: 5, unit: null, ref: 'BOX-1/L1' }],
      },
    ],
    lookup,
  );
  assert.equal(r.complete, false);
  assert.equal(r.unknowns[0]!.reason, 'unknown_supply');
});
