import { TransportCapacity } from './transport-capacity';
import { TransportCapacityId } from './transport-capacity-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import {
  TransportMode,
  ProviderType,
  CapacityStatus,
} from './transport-capacity-enums';
import {
  InvalidTransportCapacityError,
  CapacityNotAvailableError,
  CapacityNotReservedError,
  CapacityCannotBeWithdrawnError,
} from './transport-capacity-errors';

const EM = '44444444-4444-4444-8444-444444444444';
const PROVIDER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function make(
  o: {
    weightKg?: number | null;
    volumeM3?: number | null;
    originMunicipality?: string;
    destinationMunicipality?: string | null;
    availableFrom?: Date;
    availableUntil?: Date | null;
    refrigerated?: boolean;
  } = {},
): TransportCapacity {
  return TransportCapacity.create({
    id: TransportCapacityId.create(),
    emergencyId: EmergencyId.fromString(EM),
    providerType: ProviderType.Volunteer,
    providerId: PROVIDER,
    mode: TransportMode.Road,
    weightKg: o.weightKg === undefined ? 500 : o.weightKg,
    volumeM3: o.volumeM3 === undefined ? null : o.volumeM3,
    originMunicipality: o.originMunicipality ?? 'Valencia',
    destinationMunicipality:
      o.destinationMunicipality === undefined
        ? null
        : o.destinationMunicipality,
    availableFrom: o.availableFrom ?? new Date('2026-07-01T00:00:00.000Z'),
    availableUntil: o.availableUntil === undefined ? null : o.availableUntil,
    refrigerated: o.refrigerated ?? false,
    notes: null,
  });
}

describe('TransportCapacity', () => {
  it('is created Available and trims the origin municipality', () => {
    const c = make({ originMunicipality: '  Valencia  ' });
    expect(c.status).toBe(CapacityStatus.Available);
    expect(c.originMunicipality).toBe('Valencia');
  });

  it('requires a positive weight or volume', () => {
    expect(() => make({ weightKg: null, volumeM3: null })).toThrow(
      InvalidTransportCapacityError,
    );
    expect(() => make({ weightKg: 0, volumeM3: null })).toThrow(
      InvalidTransportCapacityError,
    );
    expect(() => make({ weightKg: null, volumeM3: 2 })).not.toThrow();
  });

  it('rejects an empty origin municipality', () => {
    expect(() => make({ originMunicipality: '   ' })).toThrow(
      InvalidTransportCapacityError,
    );
  });

  it('rejects availableUntil before availableFrom', () => {
    expect(() =>
      make({
        availableFrom: new Date('2026-07-02T00:00:00.000Z'),
        availableUntil: new Date('2026-07-01T00:00:00.000Z'),
      }),
    ).toThrow(InvalidTransportCapacityError);
  });

  it('reserve(): Available → Reserved, and cannot reserve twice', () => {
    const c = make();
    c.reserve();
    expect(c.status).toBe(CapacityStatus.Reserved);
    expect(() => c.reserve()).toThrow(CapacityNotAvailableError);
  });

  it('release(): Reserved → Available; releasing an Available throws', () => {
    const c = make();
    expect(() => c.release()).toThrow(CapacityNotReservedError);
    c.reserve();
    c.release();
    expect(c.status).toBe(CapacityStatus.Available);
  });

  it('withdraw(): allowed once, not twice', () => {
    const c = make();
    c.withdraw();
    expect(c.status).toBe(CapacityStatus.Withdrawn);
    expect(() => c.withdraw()).toThrow(CapacityCannotBeWithdrawnError);
  });

  it('round-trips through a snapshot', () => {
    const c = make({
      destinationMunicipality: 'Caracas',
      volumeM3: 12,
      refrigerated: true,
    });
    const restored = TransportCapacity.fromSnapshot(c.toSnapshot());
    expect(restored.toSnapshot()).toEqual(c.toSnapshot());
    expect(restored.destinationMunicipality).toBe('Caracas');
    expect(restored.refrigerated).toBe(true);
  });
});
