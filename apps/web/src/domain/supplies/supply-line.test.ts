import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyLine, deriveFromSupply, toDto, isComplete, type SupplyLine } from './supply-line.ts';
import type { Category } from './category.ts';
import type { CatalogueSupply } from './catalogue-supply.ts';

const CATS: Category[] = [
  { slug: 'water', label: 'Agua', kind: 'material', vertical: 'general', sort: 2, parentSlug: null },
  { slug: 'medical_personnel', label: 'Personal', kind: 'personnel', vertical: 'health', sort: 44, parentSlug: 'medical' },
];

const supply: CatalogueSupply = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  code: 'WAT-0001',
  name: 'Agua 1,5L',
  categorySlug: 'water',
  defaultUnit: 'botellas',
  aliases: [],
};

test('emptyLine seeds name empty, quantity 1, no supplyId, given category', () => {
  assert.deepEqual(emptyLine('water'), {
    name: '', supplyId: null, quantity: 1, unit: '', category: 'water',
  });
});

test('deriveFromSupply fills name/supplyId/category/unit from a catalogue item', () => {
  assert.deepEqual(deriveFromSupply(supply, CATS), {
    name: 'Agua 1,5L', supplyId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', category: 'water', unit: 'botellas',
  });
});

test('deriveFromSupply omits unit when the supply has no defaultUnit', () => {
  const patch = deriveFromSupply({ ...supply, defaultUnit: null }, CATS);
  assert.equal(patch.unit, undefined);
  assert.equal(patch.category, 'water');
});

test('deriveFromSupply omits category when the slug is unknown', () => {
  const patch = deriveFromSupply({ ...supply, categorySlug: 'ghost' }, CATS);
  assert.equal(patch.category, undefined);
  assert.equal(patch.name, 'Agua 1,5L');
});

test('deriveFromSupply omits category when the slug is a personnel category', () => {
  const patch = deriveFromSupply({ ...supply, categorySlug: 'medical_personnel' }, CATS);
  assert.equal(patch.category, undefined);
});

test('toDto trims, drops empty unit, passes supplyId', () => {
  const line: SupplyLine = { name: '  Agua  ', supplyId: 'x', quantity: 3, unit: '', category: 'water' };
  assert.deepEqual(toDto(line), { name: 'Agua', quantity: 3, category: 'water', supplyId: 'x' });
});

test('toDto includes unit and expiresAt when present', () => {
  const line: SupplyLine = { name: 'Agua', supplyId: null, quantity: 2, unit: 'botellas', category: 'water', expiresAt: '2026-07-01' };
  assert.deepEqual(toDto(line), { name: 'Agua', quantity: 2, category: 'water', unit: 'botellas', expiresAt: '2026-07-01' });
});

test('isComplete requires non-empty name, quantity >= 1, and a category', () => {
  assert.equal(isComplete({ name: 'Agua', supplyId: null, quantity: 1, unit: '', category: 'water' }), true);
  assert.equal(isComplete({ name: '  ', supplyId: null, quantity: 1, unit: '', category: 'water' }), false);
  assert.equal(isComplete({ name: 'Agua', supplyId: null, quantity: 0, unit: '', category: 'water' }), false);
  assert.equal(isComplete({ name: 'Agua', supplyId: null, quantity: 1, unit: '', category: '' }), false);
});
