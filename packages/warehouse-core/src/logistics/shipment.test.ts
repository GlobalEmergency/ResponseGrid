import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Shipment, CreateShipmentProps, ShipmentSnapshot } from './shipment.js';
import { ShipmentId } from './shipment-id.js';
import { ScopeId, SupplyLine } from '../kernel/index.js';
import { Category } from '../kernel/category.js';
import {
  InvalidShipmentRouteError,
  ShipmentMustHaveCargoError,
  VehicleShipmentCargoError,
} from './shipment-errors.js';

const SCOPE = '11111111-1111-4111-8111-111111111111';
const ORIGIN = '22222222-2222-4222-8222-222222222222';
const DESTINATION = '33333333-3333-4333-8333-333333333333';
const VEHICLE = '44444444-4444-4444-8444-444444444444';
const CONTAINER = '55555555-5555-4555-8555-555555555555';

const someLine = SupplyLine.create({
  name: 'Agua embotellada',
  quantity: 10,
  unit: 'l',
  category: Category.Water,
});

function makeShipment(overrides?: Partial<CreateShipmentProps>): Shipment {
  return Shipment.create({
    id: ShipmentId.create(),
    code: 'EXP-0001',
    scopeId: ScopeId.fromString(SCOPE),
    originResourceId: ORIGIN,
    destinationResourceId: DESTINATION,
    items: overrides && 'items' in overrides ? overrides.items! : [someLine],
    containerIds:
      overrides && 'containerIds' in overrides ? overrides.containerIds! : [],
    manifest: null,
    ...overrides,
  });
}

test('modo vehículo: vehicleId presente y sin carga suelta', () => {
  const s = makeShipment({ vehicleId: VEHICLE, items: [], containerIds: [] });
  assert.equal(s.vehicleId, VEHICLE);
  const back = Shipment.fromSnapshot(s.toSnapshot());
  assert.equal(back.vehicleId, VEHICLE);
});

test('modo vehículo rechaza carga suelta (items o containers)', () => {
  assert.throws(
    () =>
      makeShipment({ vehicleId: VEHICLE, items: [someLine], containerIds: [] }),
    VehicleShipmentCargoError,
  );
  assert.throws(
    () =>
      makeShipment({
        vehicleId: VEHICLE,
        items: [],
        containerIds: [CONTAINER],
      }),
    VehicleShipmentCargoError,
  );
});

test('modo vehículo rechaza vehicleId no-UUID', () => {
  assert.throws(
    () => makeShipment({ vehicleId: 'nope', items: [], containerIds: [] }),
    InvalidShipmentRouteError,
  );
});

test('modo suelto (sin vehicleId) intacto: exige carga', () => {
  assert.throws(
    () => makeShipment({ items: [], containerIds: [] }),
    ShipmentMustHaveCargoError,
  );
  const s = makeShipment({ items: [someLine] });
  assert.equal(s.vehicleId, null);
});

test('snapshot sin vehicleId (retrocompat host) → vehicleId null', () => {
  const withVehicle = makeShipment({
    vehicleId: VEHICLE,
    items: [],
    containerIds: [],
  });
  const snap = withVehicle.toSnapshot();
  // Simula un snapshot proveniente de un host que aún no persiste vehicleId:
  // se omite la clave por completo (no null), y debe seguir funcionando.
  const { vehicleId, ...withoutVehicleId } = snap;
  const s = Shipment.fromSnapshot(withoutVehicleId as ShipmentSnapshot);
  assert.equal(s.vehicleId, null);
});
