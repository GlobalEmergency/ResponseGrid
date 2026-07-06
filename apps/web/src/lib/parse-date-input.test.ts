import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDateInput } from './parse-date-input.ts';

test('parseDateInput pins a date-only value to the end of that day (UTC)', () => {
  // "valid through 2026-06-29" — not 00:00, which would expire it a day early
  // (or immediately, when the picked day is today).
  assert.equal(parseDateInput('2026-06-29'), '2026-06-29T23:59:59.999Z');
});

test('parseDateInput parses a full timestamp as-is', () => {
  assert.equal(
    parseDateInput('2026-06-29T08:30:00.000Z'),
    '2026-06-29T08:30:00.000Z',
  );
});

test('parseDateInput returns null for empty or invalid values', () => {
  assert.equal(parseDateInput(''), null);
  assert.equal(parseDateInput('   '), null);
  assert.equal(parseDateInput('not-a-date'), null);
});
