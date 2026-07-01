import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveLineMode } from './line-mode.ts';

test('catalogue when a supply is linked, regardless of committed', () => {
  assert.equal(resolveLineMode('id-1', 'Agua', false), 'catalogue');
  assert.equal(resolveLineMode('id-1', 'Agua', true), 'catalogue');
});

test('free when committed free text with a non-empty name and no link', () => {
  assert.equal(resolveLineMode(null, 'Gasas', true), 'free');
});

test('idle while typing (not committed) or when name is empty', () => {
  assert.equal(resolveLineMode(null, 'Gas', false), 'idle');
  assert.equal(resolveLineMode(null, '', true), 'idle');
  assert.equal(resolveLineMode(null, '   ', true), 'idle');
});
