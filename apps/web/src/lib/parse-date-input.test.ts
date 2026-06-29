import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDateInput } from './parse-date-input.ts';

test('parseDateInput converts a date input value to ISO', () => {
  assert.equal(parseDateInput('2026-06-29'), '2026-06-29T00:00:00.000Z');
});

test('parseDateInput returns null for empty or invalid values', () => {
  assert.equal(parseDateInput(''), null);
  assert.equal(parseDateInput('   '), null);
  assert.equal(parseDateInput('not-a-date'), null);
});
