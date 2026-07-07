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
  const line = SupplyLine.create({ ...base, category: Category.MedicalEquipment });
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
