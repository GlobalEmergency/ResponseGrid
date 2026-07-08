import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AttributeDefinition,
  AttributeDefinitionValidationError,
} from './attribute-definition.js';

const base = {
  categorySlug: 'medicines',
  key: 'principio_activo',
  dataType: 'text',
} as const;

test('create normaliza la key (trim + lowercase) y aplica defaults', () => {
  const def = AttributeDefinition.create({ ...base, key: '  Dosis_MG  ' });
  assert.equal(def.key, 'dosis_mg');
  assert.equal(def.required, false);
  assert.equal(def.sort, 0);
  assert.equal(def.scopeId, null);
  assert.equal(def.archivedAt, null);
  assert.equal(def.options, null);
  assert.equal(def.unit, null);
});

test('create rechaza key vacía o con formato inválido', () => {
  assert.throws(
    () => AttributeDefinition.create({ ...base, key: '   ' }),
    AttributeDefinitionValidationError,
  );
  assert.throws(
    () => AttributeDefinition.create({ ...base, key: 'con-guion' }),
    AttributeDefinitionValidationError,
  );
  assert.throws(
    () => AttributeDefinition.create({ ...base, key: '1numeric' }),
    AttributeDefinitionValidationError,
  );
});

test('create rechaza categorySlug vacío', () => {
  assert.throws(
    () => AttributeDefinition.create({ ...base, categorySlug: '  ' }),
    AttributeDefinitionValidationError,
  );
});

test('create rechaza un dataType inválido', () => {
  assert.throws(
    () =>
      AttributeDefinition.create({
        ...base,
        // @ts-expect-error probando un tipo inválido a propósito
        dataType: 'money',
      }),
    AttributeDefinitionValidationError,
  );
});

test('enum: exige options no vacías, normaliza labels y rechaza duplicados', () => {
  const def = AttributeDefinition.create({
    categorySlug: 'medicines',
    key: 'forma',
    dataType: 'enum',
    options: [{ value: 'tableta', label: '  Tableta  ' }, { value: 'jarabe' }],
  });
  assert.deepEqual(def.options, [
    { value: 'tableta', label: 'Tableta' },
    { value: 'jarabe' },
  ]);

  assert.throws(
    () =>
      AttributeDefinition.create({
        categorySlug: 'medicines',
        key: 'forma',
        dataType: 'enum',
      }),
    AttributeDefinitionValidationError,
  );
  assert.throws(
    () =>
      AttributeDefinition.create({
        categorySlug: 'medicines',
        key: 'forma',
        dataType: 'enum',
        options: [{ value: 'x' }, { value: 'x' }],
      }),
    AttributeDefinitionValidationError,
  );
});

test('options solo se permiten para enum', () => {
  assert.throws(
    () =>
      AttributeDefinition.create({
        ...base,
        dataType: 'text',
        options: [{ value: 'a' }],
      }),
    AttributeDefinitionValidationError,
  );
});

test('unit solo para number/quantity', () => {
  const num = AttributeDefinition.create({
    categorySlug: 'medicines',
    key: 'dosis',
    dataType: 'number',
    unit: ' mg ',
  });
  assert.equal(num.unit, 'mg');

  const qty = AttributeDefinition.create({
    categorySlug: 'water',
    key: 'volumen',
    dataType: 'quantity',
    unit: 'l',
  });
  assert.equal(qty.unit, 'l');

  assert.throws(
    () => AttributeDefinition.create({ ...base, dataType: 'text', unit: 'mg' }),
    AttributeDefinitionValidationError,
  );
});

test('create rechaza sort no entero', () => {
  assert.throws(
    () => AttributeDefinition.create({ ...base, sort: 1.5 }),
    AttributeDefinitionValidationError,
  );
});

test('es inmutable: archive/restore producen instancias nuevas', () => {
  const def = AttributeDefinition.create(base);
  const at = new Date('2026-07-08T00:00:00.000Z');
  const archived = def.archive(at);
  assert.equal(def.isArchived, false);
  assert.equal(archived.isArchived, true);
  assert.deepEqual(archived.archivedAt, at);
  assert.equal(archived.restore().isArchived, false);
});

test('snapshot round-trips', () => {
  const def = AttributeDefinition.create({
    categorySlug: 'medicines',
    key: 'forma',
    dataType: 'enum',
    required: true,
    options: [{ value: 'tableta', label: 'Tableta' }],
    sort: 3,
  });
  const back = AttributeDefinition.fromSnapshot(def.toSnapshot());
  assert.deepEqual(back.toSnapshot(), def.toSnapshot());
});
