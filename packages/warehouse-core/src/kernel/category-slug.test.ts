import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CategorySlug } from './category-slug.js';
import { Category, CORE_CATEGORY_SLUGS } from './category.js';
import { CategoryValidationError } from './category-errors.js';

test('normalizes trim + lowercase', () => {
  const slug = CategorySlug.of('  Medical_Equipment  ');
  assert.equal(slug.value, 'medical_equipment');
  assert.equal(slug.toString(), 'medical_equipment');
});

test('accepts every core category slug', () => {
  for (const slug of CORE_CATEGORY_SLUGS) {
    assert.equal(CategorySlug.of(slug).value, slug);
  }
  assert.equal(CategorySlug.of(Category.Food).value, 'food');
});

test('rejects empty, oversized and non-snake_case tokens', () => {
  assert.throws(() => CategorySlug.of('   '), CategoryValidationError);
  assert.throws(() => CategorySlug.of('x'.repeat(65)), CategoryValidationError);
  assert.throws(() => CategorySlug.of('1food'), CategoryValidationError); // leading digit
  assert.throws(() => CategorySlug.of('food-fresh'), CategoryValidationError); // hyphen
  assert.throws(() => CategorySlug.of('food fresh'), CategoryValidationError); // space
  assert.throws(() => CategorySlug.of('Food!'), CategoryValidationError);
});

test('equals compares by value', () => {
  assert.ok(CategorySlug.of('food').equals(CategorySlug.of('FOOD')));
  assert.ok(!CategorySlug.of('food').equals(CategorySlug.of('water')));
});
