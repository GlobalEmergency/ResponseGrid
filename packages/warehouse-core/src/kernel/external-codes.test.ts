import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isExternalCodeNamespace,
  normalizeExternalCodes,
  ExternalCodesValidationError,
} from './external-codes.js';

// Códigos externos estándar para interop (#398): mapa abierto namespace→código,
// compartido por `Supply` (catalog) y `CategoryDefinition` (kernel). Este es el
// validador puro que ambos usan.

test('isExternalCodeNamespace acepta slugs de namespace válidos', () => {
  for (const ns of ['unspsc', 'who_eml', 'hxl', 'a', 'x9', 'a_b_c']) {
    assert.equal(isExternalCodeNamespace(ns), true);
  }
});

test('isExternalCodeNamespace rechaza formatos inválidos', () => {
  for (const ns of ['UNSPSC', '9abc', '_ns', 'with-dash', 'with space', '']) {
    assert.equal(isExternalCodeNamespace(ns), false);
  }
  assert.equal(isExternalCodeNamespace(null), false);
  assert.equal(isExternalCodeNamespace(undefined), false);
  assert.equal(isExternalCodeNamespace(3), false);
  assert.equal(isExternalCodeNamespace('a'.repeat(65)), false);
});

test('normalizeExternalCodes null/undefined → {} (por defecto)', () => {
  assert.deepEqual(normalizeExternalCodes(null), {});
  assert.deepEqual(normalizeExternalCodes(undefined), {});
  assert.deepEqual(normalizeExternalCodes({}), {});
});

test('normalizeExternalCodes acepta un mapa válido y lo devuelve normalizado', () => {
  const out = normalizeExternalCodes({
    unspsc: '51101500',
    who_eml: 'core-121',
    hxl: '#item+code',
  });
  assert.deepEqual(out, {
    unspsc: '51101500',
    who_eml: 'core-121',
    hxl: '#item+code',
  });
});

test('normalizeExternalCodes recorta claves y valores', () => {
  const out = normalizeExternalCodes({ ' unspsc ': '  51101500  ' });
  assert.deepEqual(out, { unspsc: '51101500' });
});

test('normalizeExternalCodes devuelve un objeto nuevo (no aliasa la entrada)', () => {
  const input = { unspsc: '51101500' };
  const out = normalizeExternalCodes(input);
  assert.notEqual(out, input);
  out.unspsc = 'mutated';
  assert.equal(input.unspsc, '51101500');
});

test('normalizeExternalCodes rechaza una clave con formato inválido', () => {
  assert.throws(
    () => normalizeExternalCodes({ UNSPSC: '51101500' }),
    ExternalCodesValidationError,
  );
  assert.throws(
    () => normalizeExternalCodes({ 'with-dash': 'x' }),
    ExternalCodesValidationError,
  );
});

test('normalizeExternalCodes rechaza un valor vacío o no-string', () => {
  assert.throws(
    () => normalizeExternalCodes({ unspsc: '   ' }),
    ExternalCodesValidationError,
  );
  assert.throws(
    () => normalizeExternalCodes({ unspsc: 123 as unknown as string }),
    ExternalCodesValidationError,
  );
});

test('normalizeExternalCodes rechaza un no-objeto (array o primitivo)', () => {
  assert.throws(
    () => normalizeExternalCodes([] as unknown as Record<string, unknown>),
    ExternalCodesValidationError,
  );
  assert.throws(
    () => normalizeExternalCodes('nope' as unknown as Record<string, unknown>),
    ExternalCodesValidationError,
  );
});
