import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Supply, SupplyValidationError } from './supply.js';
import { ExternalCodesValidationError } from '../kernel/external-codes.js';

// Códigos externos estándar para interop en el INSUMO (#398): mapa abierto
// namespace→código. Por defecto `{}` (los insumos previos no se rellenan).

function base(externalCodes?: Record<string, string>) {
  return Supply.create({
    id: 'a',
    code: 'INS-0001',
    name: 'Agua',
    categorySlug: 'water',
    defaultUnit: 'und',
    ...(externalCodes !== undefined ? { externalCodes } : {}),
  });
}

test('Supply.create sin externalCodes queda con el mapa vacío', () => {
  const s = base();
  assert.deepEqual(s.externalCodes, {});
  assert.deepEqual(s.toSnapshot().externalCodes, {});
});

test('Supply.create acepta y normaliza un mapa válido', () => {
  const s = base({ unspsc: '51101500', hxl: '#item+code' });
  assert.deepEqual(s.externalCodes, {
    unspsc: '51101500',
    hxl: '#item+code',
  });
});

test('Supply.create rechaza una clave de namespace inválida', () => {
  assert.throws(
    () => base({ 'UN-SPSC': '51101500' }),
    ExternalCodesValidationError,
  );
});

test('Supply.create rechaza un valor vacío', () => {
  assert.throws(() => base({ unspsc: '   ' }), ExternalCodesValidationError);
});

test('ExternalCodesValidationError NO es un SupplyValidationError (error tipado propio)', () => {
  assert.throws(
    () => base({ unspsc: '' }),
    (err: unknown) => {
      assert.ok(err instanceof ExternalCodesValidationError);
      assert.ok(!(err instanceof SupplyValidationError));
      return true;
    },
  );
});

test('setExternalCodes reemplaza el mapa (inmutable, no muta el original)', () => {
  const s = base({ unspsc: '51101500' });
  const next = s.setExternalCodes({ who_eml: 'core-121' });
  assert.deepEqual(next.externalCodes, { who_eml: 'core-121' });
  // El original no se toca.
  assert.deepEqual(s.externalCodes, { unspsc: '51101500' });
});

test('setExternalCodes con {} limpia los códigos', () => {
  const s = base({ unspsc: '51101500' });
  assert.deepEqual(s.setExternalCodes({}).externalCodes, {});
});

test('setExternalCodes preserva el resto de la identidad', () => {
  const s = base();
  const next = s.setExternalCodes({ unspsc: '51101500' });
  assert.equal(next.id, s.id);
  assert.equal(next.code, s.code);
  assert.equal(next.name, s.name);
  assert.equal(next.categorySlug, s.categorySlug);
});

test('mutar el mapa devuelto no afecta al agregado (copia defensiva)', () => {
  const s = base({ unspsc: '51101500' });
  s.externalCodes.unspsc = 'mutated';
  assert.equal(base({ unspsc: '51101500' }).externalCodes.unspsc, '51101500');
  // El snapshot también es una copia.
  const snap = s.toSnapshot();
  snap.externalCodes.unspsc = 'mutated-too';
  assert.equal(s.externalCodes.unspsc, 'mutated');
});

test('Supply round-trip por snapshot conserva externalCodes', () => {
  const snap = {
    id: 'a',
    code: 'INS-0001',
    name: 'Agua',
    categorySlug: 'water',
    defaultUnit: 'und',
    attributes: {},
    variantOfId: null,
    status: 'active' as const,
    registrationNotes: null,
    scopeId: null,
    nature: null,
    externalCodes: { unspsc: '51101500', hxl: '#item+code' },
  };
  assert.deepEqual(Supply.fromSnapshot(snap).toSnapshot(), snap);
});
