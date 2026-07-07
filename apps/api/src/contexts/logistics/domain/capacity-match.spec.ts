import { capacityMatchesShipment } from '@globalemergency/warehouse-core/logistics';
import { ShipmentMatchCriteria } from '@globalemergency/warehouse-core/logistics';
import { TransportCapacity } from '@globalemergency/warehouse-core/logistics';
import { TransportCapacityId } from '@globalemergency/warehouse-core/logistics';
import { ScopeId } from '@globalemergency/warehouse-core/kernel';
import {
  TransportMode,
  TransportProviderType,
} from '@globalemergency/warehouse-core/logistics';
import { Capacity } from '@globalemergency/warehouse-core/logistics';
import { Coverage } from '@globalemergency/warehouse-core/logistics';
import { CapacityWindow } from '@globalemergency/warehouse-core/logistics';
import { TransportCapacitySnapshot } from '@globalemergency/warehouse-core/logistics';

const EM = '11111111-1111-4111-8111-111111111111';
const PROVIDER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORIGIN = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const DEST = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

function snapshot(opts: {
  mode?: TransportMode;
  capacity?: Capacity;
  window?: CapacityWindow;
  constraints?: string[];
}): TransportCapacitySnapshot {
  return TransportCapacity.publish({
    id: TransportCapacityId.create(),
    scopeId: ScopeId.fromString(EM),
    provider: { type: TransportProviderType.Organization, id: PROVIDER_ID },
    mode: opts.mode ?? TransportMode.Road,
    capacity: opts.capacity ?? Capacity.create({ weightKg: 1000, volumeM3: 8 }),
    coverage: Coverage.corridor({
      originResourceId: ORIGIN,
      destinationResourceId: DEST,
      originLat: null,
      originLng: null,
      destinationLat: null,
      destinationLng: null,
    }),
    window: opts.window ?? CapacityWindow.empty(),
    constraints: opts.constraints ?? [],
    notes: null,
  }).toSnapshot();
}

function criteria(
  overrides?: Partial<ShipmentMatchCriteria>,
): ShipmentMatchCriteria {
  return {
    scopeId: EM,
    originResourceId: ORIGIN,
    destinationResourceId: DEST,
    requiredMode: null,
    weightKg: null,
    volumeM3: null,
    window: { from: null, to: null },
    requiredConstraints: [],
    ...overrides,
  };
}

describe('capacityMatchesShipment', () => {
  it('matches an open criteria with a plain available capacity', () => {
    expect(capacityMatchesShipment(snapshot({}), criteria())).toBe(true);
  });

  describe('mode', () => {
    it('matches when the required mode equals the capacity mode', () => {
      const snap = snapshot({ mode: TransportMode.Air });
      expect(
        capacityMatchesShipment(
          snap,
          criteria({ requiredMode: TransportMode.Air }),
        ),
      ).toBe(true);
    });

    it('excludes when the required mode differs from the capacity mode', () => {
      const snap = snapshot({ mode: TransportMode.Road });
      expect(
        capacityMatchesShipment(
          snap,
          criteria({ requiredMode: TransportMode.Air }),
        ),
      ).toBe(false);
    });

    it('does not filter on mode when no required mode is set', () => {
      const snap = snapshot({ mode: TransportMode.Sea });
      expect(capacityMatchesShipment(snap, criteria())).toBe(true);
    });
  });

  describe('capacity >= load', () => {
    it('excludes a capacity too small for the stated weight', () => {
      const snap = snapshot({
        capacity: Capacity.create({ weightKg: 100, volumeM3: null }),
      });
      expect(capacityMatchesShipment(snap, criteria({ weightKg: 500 }))).toBe(
        false,
      );
    });

    it('excludes a capacity too small for the stated volume', () => {
      const snap = snapshot({
        capacity: Capacity.create({ weightKg: null, volumeM3: 2 }),
      });
      expect(capacityMatchesShipment(snap, criteria({ volumeM3: 10 }))).toBe(
        false,
      );
    });

    it('includes a capacity that fits the stated weight and volume', () => {
      const snap = snapshot({
        capacity: Capacity.create({ weightKg: 1000, volumeM3: 8 }),
      });
      expect(
        capacityMatchesShipment(snap, criteria({ weightKg: 500, volumeM3: 4 })),
      ).toBe(true);
    });

    it('does not filter on a dimension the shipment omits (weight only)', () => {
      // Capacity declares only volume; shipment states only weight.
      const snap = snapshot({
        capacity: Capacity.create({ weightKg: null, volumeM3: 8 }),
      });
      expect(capacityMatchesShipment(snap, criteria({ weightKg: 500 }))).toBe(
        true,
      );
    });

    it('does not filter on a dimension the capacity omits', () => {
      // Shipment states weight; capacity declares only volume -> cannot
      // disprove the weight fit, so do not exclude.
      const snap = snapshot({
        capacity: Capacity.create({ weightKg: null, volumeM3: 8 }),
      });
      expect(
        capacityMatchesShipment(snap, criteria({ weightKg: 999999 })),
      ).toBe(true);
    });
  });

  describe('window overlap', () => {
    it('excludes a capacity whose window does not overlap the shipment window', () => {
      const snap = snapshot({
        window: CapacityWindow.create({
          from: '2026-07-01T00:00:00Z',
          to: '2026-07-31T00:00:00Z',
        }),
      });
      expect(
        capacityMatchesShipment(
          snap,
          criteria({
            window: {
              from: '2026-09-01T00:00:00Z',
              to: '2026-09-30T00:00:00Z',
            },
          }),
        ),
      ).toBe(false);
    });

    it('includes a capacity whose window overlaps the shipment window', () => {
      const snap = snapshot({
        window: CapacityWindow.create({
          from: '2026-07-01T00:00:00Z',
          to: '2026-07-31T00:00:00Z',
        }),
      });
      expect(
        capacityMatchesShipment(
          snap,
          criteria({
            window: {
              from: '2026-07-10T00:00:00Z',
              to: '2026-07-20T00:00:00Z',
            },
          }),
        ),
      ).toBe(true);
    });

    it('treats an open shipment window as always overlapping', () => {
      const snap = snapshot({
        window: CapacityWindow.create({
          from: '2026-07-01T00:00:00Z',
          to: '2026-07-31T00:00:00Z',
        }),
      });
      expect(capacityMatchesShipment(snap, criteria())).toBe(true);
    });
  });

  describe('constraints', () => {
    it('excludes a capacity missing a required constraint', () => {
      const snap = snapshot({ constraints: [] });
      expect(
        capacityMatchesShipment(
          snap,
          criteria({ requiredConstraints: ['refrigerated'] }),
        ),
      ).toBe(false);
    });

    it('includes a capacity that provides every required constraint', () => {
      const snap = snapshot({ constraints: ['refrigerated', 'fragile'] });
      expect(
        capacityMatchesShipment(
          snap,
          criteria({ requiredConstraints: ['refrigerated'] }),
        ),
      ).toBe(true);
    });

    it('does not filter when the shipment requires no constraints', () => {
      const snap = snapshot({ constraints: [] });
      expect(capacityMatchesShipment(snap, criteria())).toBe(true);
    });
  });
});
