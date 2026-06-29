import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSupplyLines,
  offerTitle,
  quantityLabel,
  lineSummary,
} from './supply-lines.ts';

const isCat = (c: string) => ['food', 'water', 'hygiene'].includes(c);
const REQUIRED = { isValidCategory: isCat, allowEmpty: false };
const OPTIONAL = { isValidCategory: isCat, allowEmpty: true };

test('absent payload: [] when allowEmpty, null when required', () => {
  assert.deepEqual(parseSupplyLines('', OPTIONAL), []);
  assert.deepEqual(parseSupplyLines('   ', OPTIONAL), []);
  assert.deepEqual(parseSupplyLines(null, OPTIONAL), []);
  assert.equal(parseSupplyLines('', REQUIRED), null);
  assert.equal(parseSupplyLines(null, REQUIRED), null);
});

test('empty array respects allowEmpty', () => {
  assert.deepEqual(parseSupplyLines('[]', OPTIONAL), []);
  assert.equal(parseSupplyLines('[]', REQUIRED), null);
});

test('parses a well-formed line and trims name/unit', () => {
  const raw = JSON.stringify([
    { name: '  Agua  ', quantity: 5, unit: ' cajas ', category: 'water' },
  ]);
  assert.deepEqual(parseSupplyLines(raw, REQUIRED), [
    { name: 'Agua', quantity: 5, unit: 'cajas', category: 'water' },
  ]);
});

test('omits a blank unit instead of sending an empty string', () => {
  const raw = JSON.stringify([
    { name: 'Arroz', quantity: 2, unit: '   ', category: 'food' },
  ]);
  assert.deepEqual(parseSupplyLines(raw, REQUIRED), [
    { name: 'Arroz', quantity: 2, category: 'food' },
  ]);
});

test('returns null on malformed JSON or a non-array root', () => {
  assert.equal(parseSupplyLines('{not json', REQUIRED), null);
  assert.equal(parseSupplyLines('{"a":1}', REQUIRED), null);
});

test('rejects blank name, bad quantity, or invalid category', () => {
  assert.equal(
    parseSupplyLines(
      JSON.stringify([{ name: ' ', quantity: 1, category: 'food' }]),
      REQUIRED,
    ),
    null,
  );
  for (const q of [0, -1, 1.5, '2']) {
    assert.equal(
      parseSupplyLines(
        JSON.stringify([{ name: 'X', quantity: q, category: 'food' }]),
        REQUIRED,
      ),
      null,
      `quantity=${String(q)} should be rejected`,
    );
  }
  assert.equal(
    parseSupplyLines(
      JSON.stringify([{ name: 'X', quantity: 1, category: 'weapons' }]),
      REQUIRED,
    ),
    null,
  );
});

test('offerTitle summarises a list of lines', () => {
  assert.equal(offerTitle([]), '—');
  assert.equal(offerTitle([{ name: 'Agua' }]), 'Agua');
  assert.equal(offerTitle([{ name: 'Agua' }, { name: 'Arroz' }]), 'Agua +1');
});

test('quantityLabel and lineSummary format a line', () => {
  assert.equal(quantityLabel({ quantity: 5, unit: 'cajas' }), '5 cajas');
  assert.equal(quantityLabel({ quantity: 3 }), '3');
  assert.equal(quantityLabel({ quantity: 3, unit: '' }), '3');
  assert.equal(lineSummary({ name: 'Agua', quantity: 5, unit: 'L' }), 'Agua · 5 L');
});
