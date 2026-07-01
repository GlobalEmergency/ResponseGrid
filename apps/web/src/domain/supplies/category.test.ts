import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fromCategoryDto,
  isMaterialCategory,
  labelForCategory,
  resolveCategory,
  sortCategories,
  type Category,
} from './category.ts';

const dto = {
  slug: 'water',
  label: 'Agua',
  labelEs: 'Agua',
  labelEn: 'Water',
  parentSlug: null,
  vertical: 'general',
  sort: 2,
  codePrefix: 'WAT',
  kind: 'material' as const,
};

test('fromCategoryDto maps the wire DTO to the domain Category (localized label kept)', () => {
  assert.deepEqual(fromCategoryDto(dto), {
    slug: 'water',
    label: 'Agua',
    kind: 'material',
    vertical: 'general',
    sort: 2,
    parentSlug: null,
  });
});

test('isMaterialCategory is true for material, false for personnel', () => {
  assert.equal(isMaterialCategory(fromCategoryDto(dto)), true);
  assert.equal(
    isMaterialCategory(fromCategoryDto({ ...dto, slug: 'medical_personnel', kind: 'personnel' })),
    false,
  );
});

test('resolveCategory finds by slug, or null when absent', () => {
  const all: Category[] = [fromCategoryDto(dto)];
  assert.equal(resolveCategory('water', all)?.slug, 'water');
  assert.equal(resolveCategory('nope', all), null);
});

test('sortCategories orders by sort then label', () => {
  const cats = [
    fromCategoryDto({ ...dto, slug: 'tools', label: 'Herramientas', sort: 5 }),
    fromCategoryDto({ ...dto, slug: 'food', label: 'Alimentos', sort: 1 }),
    fromCategoryDto({ ...dto, slug: 'water', label: 'Agua', sort: 5 }),
  ];
  assert.deepEqual(sortCategories(cats).map((c) => c.slug), ['food', 'water', 'tools']);
});

test('labelForCategory returns the matching label when the slug is found', () => {
  const all: Category[] = [fromCategoryDto(dto)];
  assert.equal(labelForCategory('water', all), 'Agua');
});

test('labelForCategory falls back to the slug when not found', () => {
  const all: Category[] = [fromCategoryDto(dto)];
  assert.equal(labelForCategory('nope', all), 'nope');
});

test('labelForCategory falls back to the slug when the catalogue is empty', () => {
  assert.equal(labelForCategory('water', []), 'water');
});
