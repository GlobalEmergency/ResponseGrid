import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Supply } from './supply.js';
import { SupplyAlias } from './supply-alias.js';

// Tenencia (#397): `scopeId` opaco en Supply y SupplyAlias. Global = null;
// tenant = un id. Aditivo: por defecto null (comportamiento previo).

test('Supply.create sin scopeId es global (null)', () => {
  const s = Supply.create({
    id: 'a',
    code: 'INS-0001',
    name: 'Agua',
    categorySlug: 'food',
    defaultUnit: 'und',
  });
  assert.equal(s.scopeId, null);
  assert.equal(s.toSnapshot().scopeId, null);
});

test('Supply.create con scopeId lo conserva (normalizado)', () => {
  const s = Supply.create({
    id: 'a',
    code: 'INS-0001',
    name: 'Agua',
    categorySlug: 'food',
    defaultUnit: 'und',
    scopeId: '  tenant-1  ',
  });
  assert.equal(s.scopeId, 'tenant-1');
});

test('Supply mutadores preservan el scopeId (la identidad de tenant no cambia)', () => {
  const s = Supply.create({
    id: 'a',
    code: 'INS-0001',
    name: 'Agua',
    categorySlug: 'food',
    defaultUnit: 'und',
    scopeId: 'tenant-1',
  });
  assert.equal(s.rename('Agua potable').scopeId, 'tenant-1');
  assert.equal(s.recategorize('water').scopeId, 'tenant-1');
  assert.equal(s.archive().scopeId, 'tenant-1');
});

test('Supply round-trip por snapshot conserva scopeId', () => {
  const snap = {
    id: 'a',
    code: 'INS-0001',
    name: 'Agua',
    categorySlug: 'food',
    defaultUnit: 'und',
    attributes: {},
    variantOfId: null,
    status: 'active' as const,
    registrationNotes: null,
    scopeId: 'tenant-1',
  };
  assert.deepEqual(Supply.fromSnapshot(snap).toSnapshot(), snap);
});

test('SupplyAlias sin scopeId es global (null); con scope lo conserva', () => {
  assert.equal(
    SupplyAlias.create({ alias: 'agua', supplyId: 's1' }).scopeId,
    null,
  );
  assert.equal(
    SupplyAlias.create({ alias: 'agua', supplyId: 's1', scopeId: 'tenant-1' })
      .scopeId,
    'tenant-1',
  );
});
