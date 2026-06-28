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

/**
 * Aggregate root — an offer of *transport service* (not material): a provider
 * (a volunteer with a vehicle, or an organization such as a carrier/airline/
 * shipping line) offers to move cargo from one place to another, with a mode,
 * a capacity (weight and/or volume), a corridor (origin → optional destination)
 * or area, a time window and constraints. Distinct from the material
 * `DonationOffer` of the `offers` context. EPIC #103 · #105.
 */
export interface CreateTransportCapacityProps {
  id: TransportCapacityId;
  emergencyId: EmergencyId;
  providerType: ProviderType;
  providerId: string;
  mode: TransportMode;
  weightKg: number | null;
  volumeM3: number | null;
  originMunicipality: string;
  destinationMunicipality: string | null;
  availableFrom: Date;
  availableUntil: Date | null;
  refrigerated: boolean;
  notes: string | null;
}

export interface TransportCapacitySnapshot {
  id: string;
  emergencyId: string;
  providerType: ProviderType;
  providerId: string;
  mode: TransportMode;
  weightKg: number | null;
  volumeM3: number | null;
  originMunicipality: string;
  destinationMunicipality: string | null;
  availableFrom: Date;
  availableUntil: Date | null;
  refrigerated: boolean;
  notes: string | null;
  status: CapacityStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class TransportCapacity {
  private constructor(
    public readonly id: TransportCapacityId,
    public readonly emergencyId: EmergencyId,
    public readonly providerType: ProviderType,
    public readonly providerId: string,
    public readonly mode: TransportMode,
    public readonly weightKg: number | null,
    public readonly volumeM3: number | null,
    public readonly originMunicipality: string,
    public readonly destinationMunicipality: string | null,
    public readonly availableFrom: Date,
    public readonly availableUntil: Date | null,
    public readonly refrigerated: boolean,
    public readonly notes: string | null,
    private _status: CapacityStatus,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreateTransportCapacityProps): TransportCapacity {
    const hasWeight = props.weightKg !== null && props.weightKg > 0;
    const hasVolume = props.volumeM3 !== null && props.volumeM3 > 0;
    if (!hasWeight && !hasVolume) {
      throw new InvalidTransportCapacityError(
        'A transport capacity must declare a positive weight (kg) or volume (m³)',
      );
    }
    if (props.weightKg !== null && props.weightKg <= 0) {
      throw new InvalidTransportCapacityError(
        'weightKg must be greater than 0 when set',
      );
    }
    if (props.volumeM3 !== null && props.volumeM3 <= 0) {
      throw new InvalidTransportCapacityError(
        'volumeM3 must be greater than 0 when set',
      );
    }
    if (props.originMunicipality.trim().length === 0) {
      throw new InvalidTransportCapacityError(
        'originMunicipality must not be empty',
      );
    }
    if (
      props.availableUntil !== null &&
      props.availableUntil.getTime() < props.availableFrom.getTime()
    ) {
      throw new InvalidTransportCapacityError(
        'availableUntil must not be before availableFrom',
      );
    }
    const now = new Date();
    return new TransportCapacity(
      props.id,
      props.emergencyId,
      props.providerType,
      props.providerId,
      props.mode,
      props.weightKg,
      props.volumeM3,
      props.originMunicipality.trim(),
      props.destinationMunicipality === null
        ? null
        : props.destinationMunicipality.trim(),
      props.availableFrom,
      props.availableUntil,
      props.refrigerated,
      props.notes,
      CapacityStatus.Available,
      now,
      now,
    );
  }

  static fromSnapshot(s: TransportCapacitySnapshot): TransportCapacity {
    return new TransportCapacity(
      TransportCapacityId.fromString(s.id),
      EmergencyId.fromString(s.emergencyId),
      s.providerType,
      s.providerId,
      s.mode,
      s.weightKg,
      s.volumeM3,
      s.originMunicipality,
      s.destinationMunicipality,
      s.availableFrom,
      s.availableUntil,
      s.refrigerated,
      s.notes,
      s.status,
      s.createdAt,
      s.updatedAt,
    );
  }

  get status(): CapacityStatus {
    return this._status;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /** Reserve this capacity for a shipment (cf. #106). Must be Available. */
  reserve(): void {
    if (this._status !== CapacityStatus.Available) {
      throw new CapacityNotAvailableError();
    }
    this._status = CapacityStatus.Reserved;
    this._updatedAt = new Date();
  }

  /** Release a reserved capacity back to Available. Must be Reserved. */
  release(): void {
    if (this._status !== CapacityStatus.Reserved) {
      throw new CapacityNotReservedError();
    }
    this._status = CapacityStatus.Available;
    this._updatedAt = new Date();
  }

  /** Withdraw the offer (provider no longer offers it). Not when withdrawn. */
  withdraw(): void {
    if (this._status === CapacityStatus.Withdrawn) {
      throw new CapacityCannotBeWithdrawnError(this._status);
    }
    this._status = CapacityStatus.Withdrawn;
    this._updatedAt = new Date();
  }

  toSnapshot(): TransportCapacitySnapshot {
    return {
      id: this.id.value,
      emergencyId: this.emergencyId.value,
      providerType: this.providerType,
      providerId: this.providerId,
      mode: this.mode,
      weightKg: this.weightKg,
      volumeM3: this.volumeM3,
      originMunicipality: this.originMunicipality,
      destinationMunicipality: this.destinationMunicipality,
      availableFrom: this.availableFrom,
      availableUntil: this.availableUntil,
      refrigerated: this.refrigerated,
      notes: this.notes,
      status: this._status,
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
