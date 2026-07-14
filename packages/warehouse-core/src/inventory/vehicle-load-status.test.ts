import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vehicleLoadStatus } from './vehicle-load-status.js';
import type { LoadTotals } from './compute-load.js';

function totals(over: Partial<LoadTotals> = {}): LoadTotals {
  return {
    weightKg: 0,
    volumeM3: 0,
    weightComplete: true,
    volumeComplete: true,
    complete: true,
    unknowns: [],
    personnel: [],
    ...over,
  };
}

test('sin capacidad máxima: utilización null, nunca overflow', () => {
  const s = vehicleLoadStatus(null, totals({ weightKg: 999 }));
  assert.equal(s.maxWeightKg, null);
  assert.equal(s.weightUtilizationPct, null);
  assert.equal(s.overWeight, false);
});

test('utilización y overflow por peso', () => {
  const s = vehicleLoadStatus(
    { weightKg: 1000, volumeM3: null },
    totals({ weightKg: 1200, volumeM3: 3 }),
  );
  assert.equal(s.weightUtilizationPct, 120);
  assert.equal(s.overWeight, true);
  assert.equal(s.volumeUtilizationPct, null); // no hay límite de volumen
  assert.equal(s.overVolume, false);
});

test('dentro de capacidad: sin overflow', () => {
  const s = vehicleLoadStatus(
    { weightKg: 1000, volumeM3: 10 },
    totals({ weightKg: 800, volumeM3: 4 }),
  );
  assert.equal(s.weightUtilizationPct, 80);
  assert.equal(s.volumeUtilizationPct, 40);
  assert.equal(s.overWeight, false);
  assert.equal(s.overVolume, false);
});

test('dato incompleto se propaga (el total es límite inferior)', () => {
  const s = vehicleLoadStatus(
    { weightKg: 1000, volumeM3: null },
    totals({ weightKg: 500, weightComplete: false, complete: false }),
  );
  assert.equal(s.incomplete, true);
});

test('nunca lanza (soft-warn), incluso muy por encima', () => {
  assert.doesNotThrow(() =>
    vehicleLoadStatus(
      { weightKg: 1, volumeM3: 1 },
      totals({ weightKg: 1e6, volumeM3: 1e6 }),
    ),
  );
});
