import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AttributeDefinition } from './attribute-definition.js';
import { validateAttributes } from './validate-attributes.js';
import { AttributeValidationError } from './supply-errors.js';

const def = (
  key: string,
  extra: Partial<Parameters<typeof AttributeDefinition.create>[0]> = {},
): AttributeDefinition =>
  AttributeDefinition.create({
    categorySlug: 'medicines',
    key,
    dataType: 'text',
    ...extra,
  });

test('esquema vacío: passthrough sin gobierno', () => {
  const out = validateAttributes({ cualquier_cosa: 1 }, []);
  assert.deepEqual(out, { cualquier_cosa: 1 });
});

test('coacciona number/integer desde string y valida', () => {
  const schema = [
    def('dosis', { dataType: 'number' }),
    def('unidades', { dataType: 'integer' }),
  ];
  const out = validateAttributes({ dosis: '2.5', unidades: '3' }, schema);
  assert.deepEqual(out, { dosis: 2.5, unidades: 3 });

  assert.throws(
    () => validateAttributes({ dosis: 'x', unidades: 3 }, schema),
    AttributeValidationError,
  );
  assert.throws(
    () => validateAttributes({ dosis: 1, unidades: 3.5 }, schema),
    AttributeValidationError,
  );
});

test('coacciona boolean desde string/número', () => {
  const schema = [def('refrigerado', { dataType: 'boolean' })];
  assert.deepEqual(validateAttributes({ refrigerado: 'true' }, schema), {
    refrigerado: true,
  });
  assert.deepEqual(validateAttributes({ refrigerado: '0' }, schema), {
    refrigerado: false,
  });
  assert.throws(
    () => validateAttributes({ refrigerado: 'quizas' }, schema),
    AttributeValidationError,
  );
});

test('coacciona date a ISO y rechaza fechas inválidas', () => {
  const schema = [def('caduca', { dataType: 'date' })];
  const out = validateAttributes({ caduca: '2026-07-08' }, schema);
  assert.equal(out.caduca, new Date('2026-07-08').toISOString());
  assert.throws(
    () => validateAttributes({ caduca: 'no-es-fecha' }, schema),
    AttributeValidationError,
  );
});

test('enum: acepta valores válidos y rechaza el resto', () => {
  const schema = [
    def('forma', {
      dataType: 'enum',
      options: [{ value: 'tableta' }, { value: 'jarabe' }],
    }),
  ];
  assert.deepEqual(validateAttributes({ forma: 'tableta' }, schema), {
    forma: 'tableta',
  });
  assert.throws(
    () => validateAttributes({ forma: 'crema' }, schema),
    AttributeValidationError,
  );
});

test('required: falla si un requerido falta o está vacío', () => {
  const schema = [def('principio_activo', { required: true })];
  assert.throws(() => validateAttributes({}, schema), AttributeValidationError);
  assert.throws(
    () => validateAttributes({ principio_activo: '   ' }, schema),
    AttributeValidationError,
  );
  const out = validateAttributes({ principio_activo: 'Amoxicilina' }, schema);
  assert.deepEqual(out, { principio_activo: 'Amoxicilina' });
});

test('quantity: hereda la unidad de la definición y valida coincidencia', () => {
  const schema = [def('volumen', { dataType: 'quantity', unit: 'l' })];
  assert.deepEqual(validateAttributes({ volumen: 1.5 }, schema), {
    volumen: { value: 1.5, unit: 'l' },
  });
  assert.deepEqual(
    validateAttributes({ volumen: { value: 2, unit: 'l' } }, schema),
    { volumen: { value: 2, unit: 'l' } },
  );
  assert.throws(
    () => validateAttributes({ volumen: { value: 2, unit: 'ml' } }, schema),
    AttributeValidationError,
  );
});

test('rechaza claves desconocidas para la categoría', () => {
  const schema = [def('principio_activo')];
  assert.throws(
    () =>
      validateAttributes(
        { principio_activo: 'x', color_favorito: 'azul' },
        schema,
      ),
    AttributeValidationError,
  );
});

test('acumula TODAS las claves ofensoras en el error', () => {
  const schema = [
    def('dosis', { dataType: 'number', required: true }),
    def('forma', { dataType: 'enum', options: [{ value: 'tableta' }] }),
  ];
  try {
    validateAttributes({ forma: 'crema' }, schema);
    assert.fail('debería haber lanzado');
  } catch (err) {
    assert.ok(err instanceof AttributeValidationError);
    assert.deepEqual(new Set(err.keys), new Set(['dosis', 'forma']));
  }
});

test('atributos opcionales ausentes se omiten sin error', () => {
  const schema = [def('opcional')];
  assert.deepEqual(validateAttributes({}, schema), {});
});
