import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SupplyLine, SupplyLineValidationError } from './supply-line.js';
import { CategoryValidationError } from './category-errors.js';
import { Category } from './category.js';

const base = {
  name: 'Agua embotellada',
  quantity: 10,
  unit: 'l',
  category: Category.Water,
} as const;

test('create normaliza el slug de categoría (trim + lowercase)', () => {
  const line = SupplyLine.create({ ...base, category: ' Food ' });
  assert.equal(line.category, 'food');
  assert.equal(line.toSnapshot().category, 'food');
});

test('create acepta los slugs core del enum', () => {
  const line = SupplyLine.create({
    ...base,
    category: Category.MedicalEquipment,
  });
  assert.equal(line.category, 'medical_equipment');
});

test('create rechaza un slug con formato inválido', () => {
  assert.throws(
    () => SupplyLine.create({ ...base, category: 'food-fresh' }),
    CategoryValidationError,
  );
  assert.throws(
    () => SupplyLine.create({ ...base, category: '   ' }),
    CategoryValidationError,
  );
});

test('create sigue validando nombre y cantidad', () => {
  assert.throws(
    () => SupplyLine.create({ ...base, name: '   ' }),
    SupplyLineValidationError,
  );
  assert.throws(
    () => SupplyLine.create({ ...base, quantity: 0 }),
    SupplyLineValidationError,
  );
});

// #348 — the web (`backend-error-messages.ts`) localizes by `.code`, not by
// matching `.message` prose, so these codes must stay stable regardless of
// wording changes above.
test('SupplyLineValidationError expone un code estable por cada invariante (#348)', () => {
  try {
    SupplyLine.create({ ...base, name: '' });
    assert.fail('should have thrown');
  } catch (err) {
    if (!(err instanceof SupplyLineValidationError)) throw err;
    assert.equal(err.code, 'supply_name_required');
  }

  try {
    SupplyLine.create({ ...base, quantity: -1 });
    assert.fail('should have thrown');
  } catch (err) {
    if (!(err instanceof SupplyLineValidationError)) throw err;
    assert.equal(err.code, 'supply_quantity_invalid');
  }

  try {
    SupplyLine.create({ ...base, expiresAt: 'not-a-date' });
    assert.fail('should have thrown');
  } catch (err) {
    if (!(err instanceof SupplyLineValidationError)) throw err;
    assert.equal(err.code, 'supply_expiry_invalid');
  }
});
