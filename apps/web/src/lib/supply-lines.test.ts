import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSupplyLines } from './supply-lines.ts';

const CATS = ['food', 'water', 'hygiene'] as const;

test('empty or whitespace payload yields an empty list (optional field)', () => {
  assert.deepEqual(parseSupplyLines(''), []);
  assert.deepEqual(parseSupplyLines('   '), []);
  assert.deepEqual(parseSupplyLines(null), []);
  assert.deepEqual(parseSupplyLines(undefined), []);
});

test('parses a well-formed line and trims name/unit', () => {
  const raw = JSON.stringify([
    { name: '  Agua  ', quantity: 5, unit: ' cajas ', category: 'water' },
  ]);
  assert.deepEqual(parseSupplyLines(raw, CATS), [
    { name: 'Agua', quantity: 5, unit: 'cajas', category: 'water' },
  ]);
});

test('omits an empty/whitespace unit instead of sending a blank string', () => {
  const raw = JSON.stringify([
    { name: 'Arroz', quantity: 2, unit: '   ', category: 'food' },
  ]);
  assert.deepEqual(parseSupplyLines(raw, CATS), [
    { name: 'Arroz', quantity: 2, category: 'food' },
  ]);
});

test('returns null on malformed JSON or a non-array root', () => {
  assert.equal(parseSupplyLines('{not json', CATS), null);
  assert.equal(parseSupplyLines('{"a":1}', CATS), null);
  assert.equal(parseSupplyLines('42', CATS), null);
});

test('rejects lines with a missing/blank name', () => {
  assert.equal(
    parseSupplyLines(JSON.stringify([{ name: '  ', quantity: 1, category: 'food' }]), CATS),
    null,
  );
  assert.equal(
    parseSupplyLines(JSON.stringify([{ quantity: 1, category: 'food' }]), CATS),
    null,
  );
});

test('rejects non-positive or non-integer quantities', () => {
  for (const quantity of [0, -3, 1.5, '2']) {
    assert.equal(
      parseSupplyLines(
        JSON.stringify([{ name: 'X', quantity, category: 'food' }]),
        CATS,
      ),
      null,
      `quantity=${String(quantity)} should be rejected`,
    );
  }
});

test('enforces the injected category allow-list when provided', () => {
  const raw = JSON.stringify([{ name: 'X', quantity: 1, category: 'weapons' }]);
  assert.equal(parseSupplyLines(raw, CATS), null);
});

test('validates shape only (defers category check) when no allow-list is given', () => {
  const raw = JSON.stringify([{ name: 'X', quantity: 1, category: 'anything' }]);
  assert.deepEqual(parseSupplyLines(raw), [
    { name: 'X', quantity: 1, category: 'anything' },
  ]);
});
