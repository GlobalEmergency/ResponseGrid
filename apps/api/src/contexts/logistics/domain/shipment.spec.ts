import { Shipment, CarrierPrincipal } from './shipment';
import { ShipmentId } from './shipment-id';
import { SupplyLine } from '../../supplies/domain/supply-line';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { CarrierType, ShipmentStatus } from './shipment-enums';
import { Category } from '../../supplies/domain/category';
import {
  InvalidShipmentRouteError,
  InvalidShipmentTransitionError,
  ShipmentMustHaveCargoError,
} from './shipment-errors';
import { ShipmentDelivered } from './events/shipment-delivered.event';

const EM = '11111111-1111-4111-8111-111111111111';
const ORIGIN = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const DEST = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const CAPACITY = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const CARRIER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CONTAINER_A = '11111111-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CONTAINER_B = '22222222-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const CARRIER: CarrierPrincipal = {
  type: CarrierType.Volunteer,
  id: CARRIER_ID,
};

function line(name: string, quantity = 1): SupplyLine {
  return SupplyLine.create({
    name,
    quantity,
    unit: null,
    category: Category.Water,
  });
}

function makeShipment(
  overrides?: Partial<{
    items: SupplyLine[];
    containerIds: string[];
    originResourceId: string;
    destinationResourceId: string;
    manifest: string | null;
  }>,
): Shipment {
  return Shipment.create({
    id: ShipmentId.create(),
    emergencyId: EmergencyId.fromString(EM),
    originResourceId: overrides?.originResourceId ?? ORIGIN,
    destinationResourceId: overrides?.destinationResourceId ?? DEST,
    items: overrides?.items ?? [line('Agua', 5)],
    containerIds: overrides?.containerIds ?? [],
    manifest:
      overrides && 'manifest' in overrides
        ? overrides.manifest
        : 'Manifiesto: agua potable',
  });
}

describe('Shipment aggregate — creation', () => {
  it('creates with planned status and no carrier/capacity', () => {
    const s = makeShipment();
    expect(s.status).toBe(ShipmentStatus.Planned);
    expect(s.carrier).toBeNull();
    expect(s.assignedCapacityId).toBeNull();
    expect(s.containerIds).toEqual([]);
    expect(s.pullDomainEvents()).toHaveLength(0);
  });

  it('can be created with containers only (no loose lines)', () => {
    const s = makeShipment({ items: [], containerIds: [CONTAINER_A] });
    expect(s.items).toHaveLength(0);
    expect(s.containerIds).toEqual([CONTAINER_A]);
  });

  it('throws when it carries neither lines nor containers', () => {
    expect(() => makeShipment({ items: [], containerIds: [] })).toThrow(
      ShipmentMustHaveCargoError,
    );
  });

  it('dedupes repeated container ids', () => {
    const s = makeShipment({
      items: [],
      containerIds: [CONTAINER_A, CONTAINER_A, CONTAINER_B],
    });
    expect(s.containerIds).toEqual([CONTAINER_A, CONTAINER_B]);
  });

  it('throws when a container id is not a uuid', () => {
    expect(() =>
      makeShipment({ items: [], containerIds: ['not-a-uuid'] }),
    ).toThrow(InvalidShipmentRouteError);
  });

  it('throws when origin and destination are equal', () => {
    expect(() =>
      makeShipment({ originResourceId: ORIGIN, destinationResourceId: ORIGIN }),
    ).toThrow(InvalidShipmentRouteError);
  });

  it('throws when a route endpoint is not a uuid', () => {
    expect(() => makeShipment({ originResourceId: 'not-a-uuid' })).toThrow(
      InvalidShipmentRouteError,
    );
  });
});

describe('Shipment aggregate — status machine (valid transitions)', () => {
  it('assignCapacity: planned → assigned (with carrier)', () => {
    const s = makeShipment();
    s.assignCapacity(CAPACITY, CARRIER);
    expect(s.status).toBe(ShipmentStatus.Assigned);
    expect(s.assignedCapacityId).toBe(CAPACITY);
    expect(s.carrier).toEqual(CARRIER);
  });

  it('assignCapacity: planned → assigned (internal transfer, no carrier)', () => {
    const s = makeShipment();
    s.assignCapacity(CAPACITY, null);
    expect(s.status).toBe(ShipmentStatus.Assigned);
    expect(s.carrier).toBeNull();
  });

  it('markInTransit: assigned → in_transit', () => {
    const s = makeShipment();
    s.assignCapacity(CAPACITY, CARRIER);
    s.markInTransit();
    expect(s.status).toBe(ShipmentStatus.InTransit);
  });

  it('confirmDelivery: in_transit → delivered and emits ShipmentDelivered', () => {
    const s = makeShipment();
    s.assignCapacity(CAPACITY, CARRIER);
    s.markInTransit();
    s.confirmDelivery();
    expect(s.status).toBe(ShipmentStatus.Delivered);

    const events = s.pullDomainEvents();
    expect(events).toHaveLength(1);
    const evt = events[0] as ShipmentDelivered;
    expect(evt).toBeInstanceOf(ShipmentDelivered);
    expect(evt.eventName).toBe('shipment.delivered');
    expect(evt.aggregateId).toBe(s.id.value);
    expect(evt.payload).toMatchObject({
      emergencyId: EM,
      originResourceId: ORIGIN,
      destinationResourceId: DEST,
      assignedCapacityId: CAPACITY,
      carrierType: CarrierType.Volunteer,
      carrierId: CARRIER_ID,
    });
    // events drain once
    expect(s.pullDomainEvents()).toHaveLength(0);
  });

  it('markFailed: in_transit → failed', () => {
    const s = makeShipment();
    s.assignCapacity(CAPACITY, CARRIER);
    s.markInTransit();
    s.markFailed();
    expect(s.status).toBe(ShipmentStatus.Failed);
  });

  it('cancel: planned → cancelled', () => {
    const s = makeShipment();
    s.cancel();
    expect(s.status).toBe(ShipmentStatus.Cancelled);
  });

  it('cancel: assigned → cancelled', () => {
    const s = makeShipment();
    s.assignCapacity(CAPACITY, CARRIER);
    s.cancel();
    expect(s.status).toBe(ShipmentStatus.Cancelled);
  });
});

describe('Shipment aggregate — status machine (rejected transitions)', () => {
  it('cannot assign capacity twice (assigned → assigned)', () => {
    const s = makeShipment();
    s.assignCapacity(CAPACITY, CARRIER);
    expect(() => s.assignCapacity(CAPACITY, CARRIER)).toThrow(
      InvalidShipmentTransitionError,
    );
  });

  it('cannot mark in_transit while still planned', () => {
    const s = makeShipment();
    expect(() => s.markInTransit()).toThrow(InvalidShipmentTransitionError);
  });

  it('cannot deliver unless in_transit (planned)', () => {
    const s = makeShipment();
    expect(() => s.confirmDelivery()).toThrow(InvalidShipmentTransitionError);
  });

  it('cannot deliver unless in_transit (assigned)', () => {
    const s = makeShipment();
    s.assignCapacity(CAPACITY, CARRIER);
    expect(() => s.confirmDelivery()).toThrow(InvalidShipmentTransitionError);
    expect(s.pullDomainEvents()).toHaveLength(0);
  });

  it('cannot fail unless in_transit', () => {
    const s = makeShipment();
    s.assignCapacity(CAPACITY, CARRIER);
    expect(() => s.markFailed()).toThrow(InvalidShipmentTransitionError);
  });

  it('cannot cancel after in_transit', () => {
    const s = makeShipment();
    s.assignCapacity(CAPACITY, CARRIER);
    s.markInTransit();
    expect(() => s.cancel()).toThrow(InvalidShipmentTransitionError);
  });

  it('cannot cancel a delivered shipment', () => {
    const s = makeShipment();
    s.assignCapacity(CAPACITY, CARRIER);
    s.markInTransit();
    s.confirmDelivery();
    expect(() => s.cancel()).toThrow(InvalidShipmentTransitionError);
  });

  it('cannot re-deliver a delivered shipment', () => {
    const s = makeShipment();
    s.assignCapacity(CAPACITY, CARRIER);
    s.markInTransit();
    s.confirmDelivery();
    s.pullDomainEvents();
    expect(() => s.confirmDelivery()).toThrow(InvalidShipmentTransitionError);
  });

  it('the transition error carries from/to', () => {
    const s = makeShipment();
    try {
      s.confirmDelivery();
      fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(InvalidShipmentTransitionError);
      const err = e as InvalidShipmentTransitionError;
      expect(err.from).toBe(ShipmentStatus.Planned);
      expect(err.to).toBe(ShipmentStatus.Delivered);
    }
  });
});

describe('Shipment aggregate — snapshot round-trip', () => {
  it('round-trips a planned internal transfer (lines + containers, no carrier)', () => {
    const s = makeShipment({
      items: [
        SupplyLine.create({
          name: 'mantas',
          quantity: 20,
          unit: 'uds',
          category: Category.Clothing,
        }),
        line('varios'),
      ],
      containerIds: [CONTAINER_A, CONTAINER_B],
      manifest: null,
    });
    const restored = Shipment.fromSnapshot(s.toSnapshot());
    expect(restored.id.value).toBe(s.id.value);
    expect(restored.emergencyId.value).toBe(EM);
    expect(restored.originResourceId).toBe(ORIGIN);
    expect(restored.destinationResourceId).toBe(DEST);
    expect(restored.items).toHaveLength(2);
    expect(restored.items[0].name).toBe('mantas');
    expect(restored.items[0].quantity).toBe(20);
    expect(restored.containerIds).toEqual([CONTAINER_A, CONTAINER_B]);
    expect(restored.assignedCapacityId).toBeNull();
    expect(restored.carrier).toBeNull();
    expect(restored.manifest).toBeNull();
    expect(restored.status).toBe(ShipmentStatus.Planned);
  });

  it('round-trips an assigned shipment with a carrier and capacity', () => {
    const s = makeShipment();
    s.assignCapacity(CAPACITY, {
      type: CarrierType.Organization,
      id: CARRIER_ID,
    });
    const restored = Shipment.fromSnapshot(s.toSnapshot());
    expect(restored.assignedCapacityId).toBe(CAPACITY);
    expect(restored.carrier).toEqual({
      type: CarrierType.Organization,
      id: CARRIER_ID,
    });
    expect(restored.status).toBe(ShipmentStatus.Assigned);
  });
});
