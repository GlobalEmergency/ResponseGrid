import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  Capacity,
  CapacityMustHaveWeightOrVolumeError,
  InvalidCapacityAmountError,
} from './capacity.js';

test('create acepta peso o volumen por separado', () => {
  const byWeight = Capacity.create({ weightKg: 500, volumeM3: null });
  assert.equal(byWeight.weightKg, 500);
  assert.equal(byWeight.volumeM3, null);

  const byVolume = Capacity.create({ weightKg: null, volumeM3: 12 });
  assert.equal(byVolume.volumeM3, 12);
});

test('create rechaza cuando faltan ambas dimensiones', () => {
  assert.throws(
    () => Capacity.create({ weightKg: null, volumeM3: null }),
    CapacityMustHaveWeightOrVolumeError,
  );
});

test('create rechaza dimensiones no positivas', () => {
  assert.throws(
    () => Capacity.create({ weightKg: 0, volumeM3: null }),
    InvalidCapacityAmountError,
  );
  assert.throws(
    () => Capacity.create({ weightKg: null, volumeM3: -1 }),
    InvalidCapacityAmountError,
  );
});

// #348 — the web localizes by `.code`, not by matching `.message` prose.
test('los errores de Capacity exponen un code estable (#348)', () => {
  try {
    Capacity.create({ weightKg: null, volumeM3: null });
    assert.fail('should have thrown');
  } catch (err) {
    if (!(err instanceof CapacityMustHaveWeightOrVolumeError)) throw err;
    assert.equal(err.code, 'capacity_weight_or_volume_required');
  }

  try {
    Capacity.create({ weightKg: -5, volumeM3: null });
    assert.fail('should have thrown');
  } catch (err) {
    if (!(err instanceof InvalidCapacityAmountError)) throw err;
    assert.equal(err.code, 'capacity_amount_invalid');
  }
});
