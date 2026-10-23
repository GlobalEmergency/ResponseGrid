import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CapacityWindow } from './capacity-window.js';
import { InvalidCapacityWindowError } from './transport-capacity-errors.js';

test('create acepta un rango válido', () => {
  const window = CapacityWindow.create({
    from: '2026-01-01T00:00:00.000Z',
    to: '2026-01-02T00:00:00.000Z',
  });
  assert.equal(window.from, '2026-01-01T00:00:00.000Z');
  assert.equal(window.to, '2026-01-02T00:00:00.000Z');
});

test('empty no declara límites', () => {
  const window = CapacityWindow.empty();
  assert.equal(window.from, null);
  assert.equal(window.to, null);
});

test('create rechaza fechas no ISO', () => {
  assert.throws(
    () => CapacityWindow.create({ from: 'nope', to: null }),
    InvalidCapacityWindowError,
  );
});

test('create rechaza from posterior a to', () => {
  assert.throws(
    () =>
      CapacityWindow.create({
        from: '2026-01-02T00:00:00.000Z',
        to: '2026-01-01T00:00:00.000Z',
      }),
    InvalidCapacityWindowError,
  );
});

// #348 — the web localizes by `.code`, not by matching `.message` prose, so
// these two distinct failures within the same class need distinct codes.
test('InvalidCapacityWindowError expone un code distinto por cada invariante (#348)', () => {
  try {
    CapacityWindow.create({ from: 'nope', to: null });
    assert.fail('should have thrown');
  } catch (err) {
    if (!(err instanceof InvalidCapacityWindowError)) throw err;
    assert.equal(err.code, 'capacity_window_invalid_date');
  }

  try {
    CapacityWindow.create({
      from: '2026-01-02T00:00:00.000Z',
      to: '2026-01-01T00:00:00.000Z',
    });
    assert.fail('should have thrown');
  } catch (err) {
    if (!(err instanceof InvalidCapacityWindowError)) throw err;
    assert.equal(err.code, 'capacity_window_order_invalid');
  }
});
