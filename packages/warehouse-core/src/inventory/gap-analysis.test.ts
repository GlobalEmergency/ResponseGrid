import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gapAnalysis } from './gap-analysis.js';
import { LoadTemplate, type LoadTemplateLineProps } from './load-template.js';
import { LoadTemplateId } from './load-template-id.js';
import { ScopeId } from '../kernel/index.js';

function kit(lines: LoadTemplateLineProps[]) {
  return LoadTemplate.create({
    id: LoadTemplateId.create(),
    scopeId: ScopeId.create(),
    code: 'K',
    name: 'K',
    lines,
  });
}

test('kit totalmente satisfecho: 100%, sin missing, permanentOk', () => {
  const t = kit([
    { supplyId: 'agua', quantity: 10, unit: 'und', permanent: true },
  ]);
  const r = gapAnalysis([{ supplyId: 'agua', quantity: 10, unit: 'und' }], t);
  assert.equal(r.missing.length, 0);
  assert.equal(r.matched.length, 1);
  assert.equal(r.completenessPct, 100);
  assert.equal(r.permanentOk, true);
});

test('falta parcial: missing con el déficit; completitud proporcional', () => {
  const t = kit([
    { supplyId: 'camilla', quantity: 4, unit: 'und', permanent: false },
    { supplyId: 'o2', quantity: 2, unit: 'und', permanent: true },
  ]);
  const r = gapAnalysis([{ supplyId: 'camilla', quantity: 2, unit: 'und' }], t);
  // camilla 2/4, o2 0/2 → satisfecho 2 de 6 → 33.3%
  assert.equal(r.completenessPct, 33.3);
  const camilla = r.missing.find((m) => m.supplyId === 'camilla');
  assert.equal(camilla?.quantity, 2);
  assert.equal(r.permanentOk, false); // falta o2 (permanent)
});

test('sobra: material no requerido y excedente van a extra (permanent false)', () => {
  const t = kit([
    { supplyId: 'agua', quantity: 5, unit: 'und', permanent: false },
  ]);
  const r = gapAnalysis(
    [
      { supplyId: 'agua', quantity: 8, unit: 'und' }, // 3 de excedente
      { supplyId: 'mantas', quantity: 3, unit: 'und' }, // no requerido
    ],
    t,
  );
  assert.equal(r.matched.length, 1);
  const aguaExtra = r.extra.find((e) => e.supplyId === 'agua');
  assert.equal(aguaExtra?.quantity, 3);
  assert.ok(r.extra.some((e) => e.supplyId === 'mantas' && e.quantity === 3));
});

test('unidad distinta no casa (sin conversión): missing + extra', () => {
  const t = kit([{ supplyId: 'agua', quantity: 1, unit: 'palet' }]);
  const r = gapAnalysis([{ supplyId: 'agua', quantity: 100, unit: 'und' }], t);
  assert.ok(r.missing.some((m) => m.supplyId === 'agua' && m.unit === 'palet'));
  assert.ok(r.extra.some((e) => e.supplyId === 'agua' && e.unit === 'und'));
});

test('plantilla vacía: 100% y permanentOk', () => {
  const r = gapAnalysis([{ supplyId: 'x', quantity: 1, unit: 'und' }], kit([]));
  assert.equal(r.completenessPct, 100);
  assert.equal(r.permanentOk, true);
  assert.equal(r.extra.length, 1);
});
