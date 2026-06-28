import { TransportCapacity } from './transport-capacity';
import { TransportCapacityId } from './transport-capacity-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import {
  TransportCapacityStatus,
  TransportMode,
  TransportProviderType,
} from './transport-capacity-enums';
import { Capacity } from './capacity';
import { Coverage } from './coverage';
import { CapacityWindow } from './capacity-window';
import {
  CapacityAlreadyWithdrawnError,
  CapacityMustHaveWeightOrVolumeError,
  InvalidCapacityAmountError,
  InvalidCapacityWindowError,
  InvalidCoverageError,
} from './transport-capacity-errors';

const EM = '11111111-1111-4111-8111-111111111111';
const PROVIDER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ORIGIN_RES = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const DEST_RES = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

function makeCapacity(
  overrides?: Partial<{
    mode: TransportMode;
    capacity: Capacity;
    coverage: Coverage;
    window: CapacityWindow;
    constraints: string[];
    notes: string | null;
  }>,
): TransportCapacity {
  return TransportCapacity.publish({
    id: TransportCapacityId.create(),
    emergencyId: EmergencyId.fromString(EM),
    provider: { type: TransportProviderType.Volunteer, id: PROVIDER_ID },
    mode: overrides?.mode ?? TransportMode.Road,
    capacity: overrides?.capacity ?? Capacity.create({ weightKg: 1000, volumeM3: 8 }),
    coverage:
      overrides?.coverage ??
      Coverage.corridor({
        originResourceId: ORIGIN_RES,
        destinationResourceId: DEST_RES,
        originLat: null,
        originLng: null,
        destinationLat: null,
        destinationLng: null,
      }),
    window: overrides?.window ?? CapacityWindow.empty(),
    constraints: overrides?.constraints ?? ['refrigerated'],
    notes: overrides?.notes ?? null,
  });
}

describe('Capacity value object', () => {
  it('accepts weight only', () => {
    const c = Capacity.create({ weightKg: 500, volumeM3: null });
    expect(c.weightKg).toBe(500);
    expect(c.volumeM3).toBeNull();
  });

  it('accepts volume only', () => {
    const c = Capacity.create({ weightKg: null, volumeM3: 12 });
    expect(c.weightKg).toBeNull();
    expect(c.volumeM3).toBe(12);
  });

  it('throws when neither weight nor volume is present', () => {
    expect(() =>
      Capacity.create({ weightKg: null, volumeM3: null }),
    ).toThrow(CapacityMustHaveWeightOrVolumeError);
  });

  it('throws when weight is not positive', () => {
    expect(() => Capacity.create({ weightKg: 0, volumeM3: null })).toThrow(
      InvalidCapacityAmountError,
    );
  });

  it('throws when volume is negative', () => {
    expect(() => Capacity.create({ weightKg: null, volumeM3: -3 })).toThrow(
      InvalidCapacityAmountError,
    );
  });
});

describe('Coverage value object', () => {
  it('builds a corridor from resource ids', () => {
    const cov = Coverage.corridor({
      originResourceId: ORIGIN_RES,
      destinationResourceId: DEST_RES,
      originLat: null,
      originLng: null,
      destinationLat: null,
      destinationLng: null,
    });
    expect(cov.kind).toBe('corridor');
    const plain = cov.toPlain();
    expect(plain.kind).toBe('corridor');
  });

  it('builds a corridor from coordinates', () => {
    const cov = Coverage.corridor({
      originResourceId: null,
      destinationResourceId: null,
      originLat: 10.5,
      originLng: -66.9,
      destinationLat: 11.0,
      destinationLng: -67.0,
    });
    expect(cov.kind).toBe('corridor');
  });

  it('throws when corridor has neither origin nor destination', () => {
    expect(() =>
      Coverage.corridor({
        originResourceId: null,
        destinationResourceId: null,
        originLat: null,
        originLng: null,
        destinationLat: null,
        destinationLng: null,
      }),
    ).toThrow(InvalidCoverageError);
  });

  it('throws when a corridor coordinate is out of range', () => {
    expect(() =>
      Coverage.corridor({
        originResourceId: null,
        destinationResourceId: null,
        originLat: 200,
        originLng: -66.9,
        destinationLat: null,
        destinationLng: null,
      }),
    ).toThrow(InvalidCoverageError);
  });

  it('builds an area coverage', () => {
    const cov = Coverage.area('Estado Vargas');
    expect(cov.kind).toBe('area');
    expect(cov.toPlain()).toEqual({ kind: 'area', area: 'Estado Vargas' });
  });

  it('throws on empty area', () => {
    expect(() => Coverage.area('  ')).toThrow(InvalidCoverageError);
  });

  it('round-trips through fromPlain', () => {
    const cov = Coverage.fromPlain({ kind: 'area', area: 'Caracas' });
    expect(cov.kind).toBe('area');
  });
});

describe('CapacityWindow value object', () => {
  it('accepts an empty window', () => {
    const w = CapacityWindow.empty();
    expect(w.from).toBeNull();
    expect(w.to).toBeNull();
  });

  it('normalizes to ISO', () => {
    const w = CapacityWindow.create({
      from: '2026-07-01T00:00:00Z',
      to: '2026-07-10T00:00:00Z',
    });
    expect(w.from).toBe('2026-07-01T00:00:00.000Z');
    expect(w.to).toBe('2026-07-10T00:00:00.000Z');
  });

  it('throws when from is after to', () => {
    expect(() =>
      CapacityWindow.create({
        from: '2026-07-10T00:00:00Z',
        to: '2026-07-01T00:00:00Z',
      }),
    ).toThrow(InvalidCapacityWindowError);
  });

  it('throws on an invalid date', () => {
    expect(() =>
      CapacityWindow.create({ from: 'not-a-date', to: null }),
    ).toThrow(InvalidCapacityWindowError);
  });
});

describe('TransportCapacity aggregate', () => {
  it('publishes with available status', () => {
    const cap = makeCapacity();
    expect(cap.status).toBe(TransportCapacityStatus.Available);
  });

  it('publish() sets all fields', () => {
    const cap = makeCapacity({ notes: 'Salida diaria 08:00' });
    expect(cap.provider.type).toBe(TransportProviderType.Volunteer);
    expect(cap.provider.id).toBe(PROVIDER_ID);
    expect(cap.mode).toBe(TransportMode.Road);
    expect(cap.capacity.weightKg).toBe(1000);
    expect(cap.capacity.volumeM3).toBe(8);
    expect(cap.coverage.kind).toBe('corridor');
    expect(cap.constraints).toEqual(['refrigerated']);
    expect(cap.notes).toBe('Salida diaria 08:00');
  });

  it('publish() normalizes constraints (trim, lowercase, dedupe)', () => {
    const cap = makeCapacity({
      constraints: ['Refrigerated', ' HAZMAT ', 'refrigerated', ''],
    });
    expect(cap.constraints).toEqual(['refrigerated', 'hazmat']);
  });

  it('withdraw() transitions available → withdrawn', () => {
    const cap = makeCapacity();
    cap.withdraw();
    expect(cap.status).toBe(TransportCapacityStatus.Withdrawn);
  });

  it('withdraw() throws CapacityAlreadyWithdrawnError when already withdrawn', () => {
    const cap = makeCapacity();
    cap.withdraw();
    expect(() => cap.withdraw()).toThrow(CapacityAlreadyWithdrawnError);
  });

  it('withdraw() bumps updatedAt', () => {
    const cap = makeCapacity();
    const before = cap.updatedAt.getTime();
    cap.withdraw();
    expect(cap.updatedAt.getTime()).toBeGreaterThanOrEqual(before);
  });

  it('toSnapshot/fromSnapshot round-trip preserves all fields (corridor)', () => {
    const cap = makeCapacity({
      window: CapacityWindow.create({
        from: '2026-07-01T00:00:00Z',
        to: null,
      }),
      constraints: ['hazmat'],
    });
    const snap = cap.toSnapshot();
    const restored = TransportCapacity.fromSnapshot(snap);

    expect(restored.id.value).toBe(cap.id.value);
    expect(restored.emergencyId.value).toBe(EM);
    expect(restored.provider.id).toBe(PROVIDER_ID);
    expect(restored.mode).toBe(TransportMode.Road);
    expect(restored.capacity.weightKg).toBe(1000);
    expect(restored.coverage.kind).toBe('corridor');
    expect(restored.window.from).toBe('2026-07-01T00:00:00.000Z');
    expect(restored.window.to).toBeNull();
    expect(restored.constraints).toEqual(['hazmat']);
    expect(restored.status).toBe(TransportCapacityStatus.Available);
  });

  it('toSnapshot/fromSnapshot round-trip preserves area coverage and withdrawn status', () => {
    const cap = makeCapacity({
      coverage: Coverage.area('Caracas'),
      capacity: Capacity.create({ weightKg: null, volumeM3: 20 }),
    });
    cap.withdraw();
    const restored = TransportCapacity.fromSnapshot(cap.toSnapshot());
    expect(restored.coverage.kind).toBe('area');
    expect(restored.capacity.weightKg).toBeNull();
    expect(restored.capacity.volumeM3).toBe(20);
    expect(restored.status).toBe(TransportCapacityStatus.Withdrawn);
  });
});
