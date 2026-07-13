import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertWarehouseCanBeArchived } from './warehouse-archival.js';
import { WarehouseNotEmptyError } from './inventory-errors.js';

test('allows archiving an empty warehouse (zero stock items)', () => {
  assert.doesNotThrow(() => assertWarehouseCanBeArchived(0));
});

test('throws WarehouseNotEmptyError when stock remains on board', () => {
  assert.throws(() => assertWarehouseCanBeArchived(1), WarehouseNotEmptyError);
  assert.throws(() => assertWarehouseCanBeArchived(42), WarehouseNotEmptyError);
});
