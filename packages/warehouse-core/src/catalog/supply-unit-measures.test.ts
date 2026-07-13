import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Supply, SupplyValidationError } from './supply.js';

const BASE = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  code: 'WAT-0001',
  name: 'Agua embotellada 1.5L',
  categorySlug: 'water',
  defaultUnit: 'und',
};

test('sin medidas: por defecto null (desconocidas)', () => {
  const s = Supply.create(BASE);
  assert.equal(s.unitWeightKg, null);
  assert.equal(s.unitVolumeM3, null);
});

test('acepta medidas positivas y hacen round-trip por snapshot', () => {
  const s = Supply.create({
    ...BASE,
    unitWeightKg: 1.55,
    unitVolumeM3: 0.0016,
  });
  const back = Supply.fromSnapshot(s.toSnapshot());
  assert.equal(back.unitWeightKg, 1.55);
  assert.equal(back.unitVolumeM3, 0.0016);
});

test('rechaza peso no positivo o no finito', () => {
  for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => Supply.create({ ...BASE, unitWeightKg: bad }),
      SupplyValidationError,
    );
  }
});

test('rechaza volumen no positivo o no finito', () => {
  assert.throws(
    () => Supply.create({ ...BASE, unitVolumeM3: 0 }),
    SupplyValidationError,
  );
});

test('setUnitMeasures reclasifica inmutablemente y null limpia', () => {
  const s = Supply.create({ ...BASE, unitWeightKg: 2 });
  const updated = s.setUnitMeasures(1.5, 0.002);
  assert.equal(s.unitWeightKg, 2); // el original intacto
  assert.equal(updated.unitWeightKg, 1.5);
  assert.equal(updated.unitVolumeM3, 0.002);
  const cleared = updated.setUnitMeasures(null, null);
  assert.equal(cleared.unitWeightKg, null);
  assert.equal(cleared.unitVolumeM3, null);
});
