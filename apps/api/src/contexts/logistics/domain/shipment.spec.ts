import { Shipment, CarrierPrincipal } from './shipment';
import { ShipmentId } from './shipment-id';
import { ShipmentItem } from './shipment-item';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { CarrierType, ShipmentStatus } from './shipment-enums';
import { Category } from '../../supplies/domain/category';
import {
  InvalidShipmentRouteError,
  InvalidShipmentTransitionError,
  ShipmentItemValidationError,
  ShipmentMustHaveItemsError,
} from './shipment-errors';
import { ShipmentDelivered } from './events/shipment-delivered.event';

const EM = '11111111-1111-4111-8111-111111111111';
const ORIGIN = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const DEST = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const CAPACITY = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const CARRIER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const CARRIER: CarrierPrincipal = {
  type: CarrierType.Volunteer,
  id: CARRIER_ID,
};

function makeShipment(
  overrides?: Partial<{
    items: ShipmentItem[];
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
    items: overrides?.items ?? [
      ShipmentItem.create({ description: '5 cajas de agua', quantity: 5 }),
    ],
    manifest:
      overrides && 'manifest' in overrides
        ? overrides.manifest
        : 'Manifiesto: agua potable',
  });
}

describe('ShipmentItem value object', () => {
  it('accepts a description-only item (quantity/unit/category optional)', () => {
    const item = ShipmentItem.create({ description: 'ropa surtida' });
    expect(item.description).toBe('ropa surtida');
    expect(item.quantity).toBeNull();
    expect(item.unit).toBeNull();
    expect(item.category).toBeNull();
  });

  it('keeps all provided fields', () => {
    const item = ShipmentItem.create({
      description: 'agua',
      quantity: 10,
      unit: 'cajas',
      category: Category.Food,
    });
    expect(item.quantity).toBe(10);
    expect(item.unit).toBe('cajas');
    expect(item.category).toBe(Category.Food);
  });

  it('trims the description', () => {
    expect(ShipmentItem.create({ description: '  agua  ' }).description).toBe(
      'agua',
    );
  });

  it('throws on an empty description', () => {
    expect(() => ShipmentItem.create({ description: '   ' })).toThrow(
      ShipmentItemValidationError,
    );
  });

  it('throws on a non-positive quantity when provided', () => {
    expect(() =>
      ShipmentItem.create({ description: 'agua', quantity: 0 }),
    ).toThrow(ShipmentItemValidationError);
  });
});

describe('Shipment aggregate — creation', () => {
  it('creates with planned status and no carrier/capacity', () => {
    const s = makeShipment();
    expect(s.status).toBe(ShipmentStatus.Planned);
    expect(s.carrier).toBeNull();
    expect(s.assignedCapacityId).toBeNull();
    expect(s.pullDomainEvents()).toHaveLength(0);
  });

  it('throws when there are no items', () => {
    expect(() => makeShipment({ items: [] })).toThrow(
      ShipmentMustHaveItemsError,
    );
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
  it('round-trips a planned internal transfer (no carrier)', () => {
    const s = makeShipment({
      items: [
        ShipmentItem.create({
          description: 'mantas',
          quantity: 20,
          unit: 'uds',
          category: Category.Clothing,
        }),
        ShipmentItem.create({ description: 'varios' }),
      ],
      manifest: null,
    });
    const restored = Shipment.fromSnapshot(s.toSnapshot());
    expect(restored.id.value).toBe(s.id.value);
    expect(restored.emergencyId.value).toBe(EM);
    expect(restored.originResourceId).toBe(ORIGIN);
    expect(restored.destinationResourceId).toBe(DEST);
    expect(restored.items).toHaveLength(2);
    expect(restored.items[0].description).toBe('mantas');
    expect(restored.items[0].quantity).toBe(20);
    expect(restored.items[1].quantity).toBeNull();
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
