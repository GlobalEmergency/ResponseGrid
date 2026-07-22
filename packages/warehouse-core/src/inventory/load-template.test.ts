import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LoadTemplate, type LoadTemplateLineProps } from './load-template.js';
import { LoadTemplateId } from './load-template-id.js';
import { LoadTemplateStatus } from './inventory-enums.js';
import {
  DuplicateTemplateLineError,
  LoadTemplateValidationError,
} from './inventory-errors.js';
import { ScopeId } from '../kernel/index.js';

function make(
  lines: LoadTemplateLineProps[] = [
    { supplyId: 's1', quantity: 2, unit: 'und', permanent: true },
  ],
) {
  return LoadTemplate.create({
    id: LoadTemplateId.create(),
    scopeId: ScopeId.create(),
    code: 'PSA',
    name: 'Kit PSA',
    lines,
  });
}

test('create normaliza y expone las líneas; status Active', () => {
  const t = make();
  assert.equal(t.status, LoadTemplateStatus.Active);
  assert.equal(t.lines.length, 1);
  assert.equal(t.lines[0]!.permanent, true);
  assert.equal(t.lines[0]!.notes, null); // permanent/notes con defaults
});

test('rechaza líneas con supplyId duplicado', () => {
  assert.throws(
    () =>
      make([
        { supplyId: 's1', quantity: 1, unit: 'und', permanent: false },
        { supplyId: 's1', quantity: 2, unit: 'und', permanent: false },
      ]),
    DuplicateTemplateLineError,
  );
});

test('rechaza cantidad no positiva, code/name/unit vacíos', () => {
  assert.throws(
    () => make([{ supplyId: 's1', quantity: 0, unit: 'und' }]),
    LoadTemplateValidationError,
  );
  assert.throws(
    () =>
      LoadTemplate.create({
        id: LoadTemplateId.create(),
        scopeId: ScopeId.create(),
        code: '',
        name: 'x',
        lines: [],
      }),
    LoadTemplateValidationError,
  );
});

test('snapshot round-trip conserva la identidad y las líneas', () => {
  const t = make();
  const back = LoadTemplate.fromSnapshot(t.toSnapshot());
  assert.deepEqual(back.toSnapshot(), t.toSnapshot());
});

test('archive pasa a Archived (idempotente)', () => {
  const t = make().archive();
  assert.equal(t.status, LoadTemplateStatus.Archived);
  assert.equal(t.archive().status, LoadTemplateStatus.Archived);
});
