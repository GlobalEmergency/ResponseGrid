import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Container } from './container.js';
import { ContainerId } from './container-id.js';
import { ContainerHolderType, ContainerType } from './container-enums.js';
import { ScopeId } from '../kernel/index.js';

const SCOPE = '11111111-1111-4111-8111-111111111111';
const RESOURCE = '22222222-2222-4222-8222-222222222222';
const VEHICLE = '33333333-3333-4333-8333-333333333333';

function make(): Container {
  return Container.create({
    id: ContainerId.create(),
    code: 'PAL-0001',
    type: ContainerType.Pallet,
    scopeId: ScopeId.fromString(SCOPE),
  });
}

test('moveToHolder mueve el container a un holder tipo vehicle', () => {
  const c = make();
  c.moveToHolder({ type: ContainerHolderType.Vehicle, id: VEHICLE });
  assert.equal(c.holder?.type, ContainerHolderType.Vehicle);
  assert.equal(c.holder?.id, VEHICLE);
});

test('round-trip por snapshot conserva el holder tipo vehicle', () => {
  const c = make();
  c.moveToHolder({ type: ContainerHolderType.Vehicle, id: VEHICLE });
  const snap = c.toSnapshot();
  assert.equal(snap.holderType, 'vehicle');
  assert.equal(snap.holderId, VEHICLE);
  const restored = Container.fromSnapshot(snap);
  assert.equal(restored.holder?.type, ContainerHolderType.Vehicle);
  assert.equal(restored.holder?.id, VEHICLE);
});

test('moveToHolder puede pasar de resource a vehicle y viceversa', () => {
  const c = make();
  c.moveToHolder({ type: ContainerHolderType.Resource, id: RESOURCE });
  assert.equal(c.holder?.type, ContainerHolderType.Resource);
  c.moveToHolder({ type: ContainerHolderType.Vehicle, id: VEHICLE });
  assert.equal(c.holder?.type, ContainerHolderType.Vehicle);
  assert.equal(c.holder?.id, VEHICLE);
});
