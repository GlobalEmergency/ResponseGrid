import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  Supply,
  SUPPLY_NATURES,
  isSupplyNature,
  SupplyValidationError,
} from './supply.js';

// Naturaleza logística (#269): clasificación fina extensible en el INSUMO
// (fungible|reusable|human). Nullable (null = sin clasificar, por defecto).

function base(nature?: 'fungible' | 'reusable' | 'human' | null) {
  return Supply.create({
    id: 'a',
    code: 'INS-0001',
    name: 'Agua',
    categorySlug: 'food',
    defaultUnit: 'und',
    ...(nature !== undefined ? { nature } : {}),
  });
}

test('SUPPLY_NATURES contiene las tres naturalezas', () => {
  assert.deepEqual([...SUPPLY_NATURES], ['fungible', 'reusable', 'human']);
});

test('isSupplyNature acepta valores válidos y rechaza el resto', () => {
  for (const n of SUPPLY_NATURES) {
    assert.equal(isSupplyNature(n), true);
  }
  assert.equal(isSupplyNature('bulk'), false);
  assert.equal(isSupplyNature(''), false);
  assert.equal(isSupplyNature(null), false);
  assert.equal(isSupplyNature(undefined), false);
  assert.equal(isSupplyNature(3), false);
});

test('Supply.create sin nature queda sin clasificar (null)', () => {
  const s = base();
  assert.equal(s.nature, null);
  assert.equal(s.toSnapshot().nature, null);
});

test('Supply.create acepta cada naturaleza válida', () => {
  for (const n of SUPPLY_NATURES) {
    assert.equal(base(n).nature, n);
  }
});

test('Supply.create con nature null es válido (sin clasificar explícito)', () => {
  assert.equal(base(null).nature, null);
});

test('Supply.create rechaza una naturaleza inválida', () => {
  assert.throws(
    () =>
      Supply.create({
        id: 'a',
        code: 'INS-0001',
        name: 'Agua',
        categorySlug: 'food',
        defaultUnit: 'und',
        // @ts-expect-error valor inválido a propósito
        nature: 'bulk',
      }),
    SupplyValidationError,
  );
});

test('reclassify asigna, cambia y limpia la naturaleza (inmutable, round-trip)', () => {
  const s = base();
  const fungible = s.reclassify('fungible');
  assert.equal(fungible.nature, 'fungible');
  // No muta el original.
  assert.equal(s.nature, null);
  // Cambia a otra naturaleza.
  assert.equal(fungible.reclassify('reusable').nature, 'reusable');
  // Limpia (vuelve a sin clasificar).
  assert.equal(fungible.reclassify(null).nature, null);
});

test('reclassify preserva el resto de la identidad', () => {
  const s = base();
  const human = s.reclassify('human');
  assert.equal(human.id, s.id);
  assert.equal(human.code, s.code);
  assert.equal(human.name, s.name);
  assert.equal(human.categorySlug, s.categorySlug);
});

test('Supply round-trip por snapshot conserva nature', () => {
  const snap = {
    id: 'a',
    code: 'INS-0001',
    name: 'Agua',
    categorySlug: 'food',
    defaultUnit: 'und',
    attributes: {},
    variantOfId: null,
    status: 'active' as const,
    registrationNotes: null,
    scopeId: null,
    nature: 'reusable' as const,
    externalCodes: {},
  };
  assert.deepEqual(Supply.fromSnapshot(snap).toSnapshot(), snap);
});
