import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Quantity } from './quantity.js';
import {
  QuantityUnitMismatchError,
  StockValidationError,
} from './stock-errors.js';

test('normalizes the unit to trimmed lowercase and rounds to 6 decimals', () => {
  const q = Quantity.of(1.23456789, '  KG  ');
  assert.equal(q.unit, 'kg');
  assert.equal(q.amount, 1.234568);
});

test('rejects negative, NaN and infinite amounts, and empty unit', () => {
  assert.throws(() => Quantity.of(-1, 'kg'), StockValidationError);
  assert.throws(() => Quantity.of(Number.NaN, 'kg'), StockValidationError);
  assert.throws(() => Quantity.of(Infinity, 'kg'), StockValidationError);
  assert.throws(() => Quantity.of(1, '   '), StockValidationError);
});

test('plus neutralizes binary-float drift (0.1 + 0.2 === 0.3)', () => {
  const sum = Quantity.of(0.1, 'l').plus(Quantity.of(0.2, 'l'));
  assert.equal(sum.amount, 0.3);
  assert.equal(sum.unit, 'l');
});

test('minus subtracts and rejects a negative result', () => {
  const r = Quantity.of(5, 'unit').minus(Quantity.of(2, 'unit'));
  assert.equal(r.amount, 3);
  assert.throws(
    () => Quantity.of(1, 'unit').minus(Quantity.of(2, 'unit')),
    StockValidationError,
  );
});

test('arithmetic and comparison across units throw', () => {
  const kg = Quantity.of(1, 'kg');
  const l = Quantity.of(1, 'l');
  assert.throws(() => kg.plus(l), QuantityUnitMismatchError);
  assert.throws(() => kg.minus(l), QuantityUnitMismatchError);
  assert.throws(() => kg.isLessThan(l), QuantityUnitMismatchError);
});

test('isZero / isLessThan / equals', () => {
  assert.ok(Quantity.of(0, 'kg').isZero());
  assert.ok(!Quantity.of(0.5, 'kg').isZero());
  assert.ok(Quantity.of(1, 'kg').isLessThan(Quantity.of(2, 'kg')));
  assert.ok(Quantity.of(2, 'kg').equals(Quantity.of(2, 'kg')));
  assert.ok(!Quantity.of(2, 'kg').equals(Quantity.of(2, 'l')));
});
