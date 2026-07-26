import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Coverage } from './coverage.js';
import { InvalidCoverageError } from './transport-capacity-errors.js';

test('area crea una cobertura por área', () => {
  const coverage = Coverage.area('Estado Vargas');
  assert.equal(coverage.kind, 'area');
  assert.deepEqual(coverage.toPlain(), { kind: 'area', area: 'Estado Vargas' });
});

test('area rechaza texto vacío', () => {
  assert.throws(() => Coverage.area('   '), InvalidCoverageError);
});

// #348 — the web localizes by `.code`, not by matching `.message` prose.
test('area expone un code estable para el error de cobertura vacía (#348)', () => {
  try {
    Coverage.area('');
    assert.fail('should have thrown');
  } catch (err) {
    if (!(err instanceof InvalidCoverageError)) throw err;
    assert.equal(err.code, 'coverage_area_required');
  }
});

test('corridor sin origen ni destino no expone code (aún sin copy en la web)', () => {
  try {
    Coverage.corridor({
      originResourceId: null,
      destinationResourceId: null,
      originLat: null,
      originLng: null,
      destinationLat: null,
      destinationLng: null,
    });
    assert.fail('should have thrown');
  } catch (err) {
    if (!(err instanceof InvalidCoverageError)) throw err;
    assert.equal(err.code, undefined);
  }
});
