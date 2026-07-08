import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CategoryRegistry } from '../kernel/category-registry.js';
import { AttributeDefinition } from './attribute-definition.js';
import { resolveEffectiveSchema } from './resolve-effective-schema.js';
import { AttributeKeyCollisionError } from './supply-errors.js';

// medical (raíz) → medicines (hija) → antibioticos (nieta)
const registry = CategoryRegistry.fromNodes([
  { slug: 'medical', parentSlug: null, codePrefix: 'MED' },
  { slug: 'medicines', parentSlug: 'medical', codePrefix: null },
  { slug: 'antibioticos', parentSlug: 'medicines', codePrefix: null },
  { slug: 'water', parentSlug: null, codePrefix: 'WAT' },
]);

const def = (
  categorySlug: string,
  key: string,
  extra: Partial<Parameters<typeof AttributeDefinition.create>[0]> = {},
): AttributeDefinition =>
  AttributeDefinition.create({
    categorySlug,
    key,
    dataType: 'text',
    ...extra,
  });

test('fusiona las definiciones de toda la ascendencia (herencia por el árbol)', () => {
  const defs = [
    def('medical', 'expiry_tracked', { dataType: 'boolean' }),
    def('medicines', 'principio_activo'),
    def('antibioticos', 'espectro'),
    def('water', 'potable', { dataType: 'boolean' }), // otra rama, no aplica
  ];

  const schema = resolveEffectiveSchema('antibioticos', defs, registry);
  const keys = schema.map((d) => d.key);
  assert.deepEqual(keys, ['expiry_tracked', 'principio_activo', 'espectro']);
});

test('una categoría raíz sólo recibe sus propias definiciones', () => {
  const defs = [
    def('medical', 'expiry_tracked'),
    def('medicines', 'principio_activo'),
  ];
  const schema = resolveEffectiveSchema('medical', defs, registry);
  assert.deepEqual(
    schema.map((d) => d.key),
    ['expiry_tracked'],
  );
});

test('ordena de la raíz hacia la hoja, luego por sort y key', () => {
  const defs = [
    def('medicines', 'z_key', { sort: 1 }),
    def('medicines', 'a_key', { sort: 1 }),
    def('medical', 'root_key', { sort: 5 }),
  ];
  const schema = resolveEffectiveSchema('medicines', defs, registry);
  assert.deepEqual(
    schema.map((d) => d.key),
    ['root_key', 'a_key', 'z_key'],
  );
});

test('ignora definiciones archivadas y de otro scope (Inc 1: sólo globales)', () => {
  const defs = [
    def('medicines', 'archivada', {
      archivedAt: new Date('2026-01-01T00:00:00Z'),
    }),
    def('medicines', 'de_tenant', { scopeId: 'tenant-1' }),
    def('medicines', 'viva'),
  ];
  const schema = resolveEffectiveSchema('medicines', defs, registry);
  assert.deepEqual(
    schema.map((d) => d.key),
    ['viva'],
  );
});

test('rechaza una colisión de key entre la categoría y un ancestro', () => {
  const defs = [
    def('medical', 'dosis'),
    def('medicines', 'dosis'), // misma key en la cadena → colisión
  ];
  assert.throws(
    () => resolveEffectiveSchema('medicines', defs, registry),
    AttributeKeyCollisionError,
  );
});

test('devuelve vacío si la familia no tiene definiciones', () => {
  assert.deepEqual(resolveEffectiveSchema('water', [], registry), []);
});
