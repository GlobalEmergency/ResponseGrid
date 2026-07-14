import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StockMovement } from './stock-movement.js';
import { StockMovementId } from './stock-movement-id.js';
import { StockItemId } from './stock-item-id.js';
import { Quantity } from './quantity.js';
import { MovementKind } from './movement-enums.js';
import { ScopeId } from '../kernel/index.js';

const BASE = {
  id: StockMovementId.fromString('11111111-1111-4111-8111-111111111111'),
  scopeId: ScopeId.fromString('22222222-2222-4222-8222-222222222222'),
  kind: MovementKind.Receipt,
  quantity: Quantity.of(5, 'und'),
  toItemId: StockItemId.fromString('33333333-3333-4333-8333-333333333333'),
  occurredAt: new Date('2026-07-14T10:00:00.000Z'),
};

test('actorId por defecto null (movimiento sin autor conocido)', () => {
  const m = StockMovement.record(BASE);
  assert.equal(m.actorId, null);
});

test('actorId opaco se conserva y hace round-trip por snapshot', () => {
  const m = StockMovement.record({ ...BASE, actorId: 'user-42' });
  assert.equal(m.actorId, 'user-42');
  const back = StockMovement.fromSnapshot(m.toSnapshot());
  assert.equal(back.actorId, 'user-42');
});

test('actorId vacío se normaliza a null', () => {
  const m = StockMovement.record({ ...BASE, actorId: '   ' });
  assert.equal(m.actorId, null);
});
