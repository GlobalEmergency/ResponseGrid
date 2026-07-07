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

test('absent payload: {items:[]} when allowEmpty, generic invalidRow when required', () => {
  assert.deepEqual(parseSupplyLines('', OPTIONAL), { items: [] });
  assert.deepEqual(parseSupplyLines('   ', OPTIONAL), { items: [] });
  assert.deepEqual(parseSupplyLines(null, OPTIONAL), { items: [] });
  assert.deepEqual(parseSupplyLines('', REQUIRED), { invalidRow: -1 });
  assert.deepEqual(parseSupplyLines(null, REQUIRED), { invalidRow: -1 });
});

test('empty array respects allowEmpty', () => {
  assert.deepEqual(parseSupplyLines('[]', OPTIONAL), { items: [] });
  assert.deepEqual(parseSupplyLines('[]', REQUIRED), { invalidRow: -1 });
});

test('parses a well-formed line and trims name/unit', () => {
  const raw = JSON.stringify([
    { name: '  Agua  ', quantity: 5, unit: ' cajas ', category: 'water' },
  ]);
  assert.deepEqual(parseSupplyLines(raw, REQUIRED), {
    items: [{ name: 'Agua', quantity: 5, unit: 'cajas', category: 'water' }],
  });
});

test('omits a blank unit instead of sending an empty string', () => {
  const raw = JSON.stringify([
    { name: 'Arroz', quantity: 2, unit: '   ', category: 'food' },
  ]);
  assert.deepEqual(parseSupplyLines(raw, REQUIRED), {
    items: [{ name: 'Arroz', quantity: 2, category: 'food' }],
  });
});

test('preserves a soft supply link when present', () => {
  const raw = JSON.stringify([
    {
      name: 'Agua',
      quantity: 12,
      category: 'water',
      supplyId: ' 1e4b5f3b-5c9c-4f77-8f50-3d2dbdc0c7d8 ',
    },
  ]);
  assert.deepEqual(parseSupplyLines(raw, REQUIRED), {
    items: [
      {
        name: 'Agua',
        quantity: 12,
        category: 'water',
        supplyId: '1e4b5f3b-5c9c-4f77-8f50-3d2dbdc0c7d8',
      },
    ],
  });
});

test('preserves a trimmed presentation, omits it when blank (#61)', () => {
  const withPres = JSON.stringify([
    { name: 'Clindamicina', quantity: 5, category: 'food', presentation: '  EV (intravenoso)  ' },
  ]);
  assert.deepEqual(parseSupplyLines(withPres, REQUIRED), {
    items: [{ name: 'Clindamicina', quantity: 5, category: 'food', presentation: 'EV (intravenoso)' }],
  });

  const blankPres = JSON.stringify([
    { name: 'Agua', quantity: 1, category: 'water', presentation: '   ' },
  ]);
  assert.deepEqual(parseSupplyLines(blankPres, REQUIRED), {
    items: [{ name: 'Agua', quantity: 1, category: 'water' }],
  });
});

test('rejects a non-string presentation', () => {
  assert.deepEqual(
    parseSupplyLines(
      JSON.stringify([{ name: 'X', quantity: 1, category: 'food', presentation: 5 }]),
      REQUIRED,
    ),
    { invalidRow: 0 },
  );
});

test('returns a generic (row-less) failure on malformed JSON or a non-array root', () => {
  assert.deepEqual(parseSupplyLines('{not json', REQUIRED), { invalidRow: -1 });
  assert.deepEqual(parseSupplyLines('{"a":1}', REQUIRED), { invalidRow: -1 });
});

test('rejects blank name, bad quantity, or invalid category', () => {
  assert.deepEqual(
    parseSupplyLines(
      JSON.stringify([{ name: ' ', quantity: 1, category: 'food' }]),
      REQUIRED,
    ),
    { invalidRow: 0 },
  );
  for (const q of [0, -1, 1.5, '2']) {
    assert.deepEqual(
      parseSupplyLines(
        JSON.stringify([{ name: 'X', quantity: q, category: 'food' }]),
        REQUIRED,
      ),
      { invalidRow: 0 },
      `quantity=${String(q)} should be rejected`,
    );
  }
  assert.deepEqual(
    parseSupplyLines(
      JSON.stringify([{ name: 'X', quantity: 1, category: 'weapons' }]),
      REQUIRED,
    ),
    { invalidRow: 0 },
  );
});

test('identifies the first invalid row when it is not the only one (start, middle, end)', () => {
  const good = { name: 'Agua', quantity: 1, category: 'water' };
  const bad = { name: '', quantity: 1, category: 'water' };

  // Invalid row is first.
  assert.deepEqual(
    parseSupplyLines(JSON.stringify([bad, good, good]), REQUIRED),
    { invalidRow: 0 },
  );

  // Invalid row is in the middle.
  assert.deepEqual(
    parseSupplyLines(JSON.stringify([good, bad, good]), REQUIRED),
    { invalidRow: 1 },
  );

  // Invalid row is last.
  assert.deepEqual(
    parseSupplyLines(JSON.stringify([good, good, bad]), REQUIRED),
    { invalidRow: 2 },
  );

  // Only the FIRST invalid row is reported when several are bad.
  assert.deepEqual(
    parseSupplyLines(JSON.stringify([good, bad, bad]), REQUIRED),
    { invalidRow: 1 },
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
