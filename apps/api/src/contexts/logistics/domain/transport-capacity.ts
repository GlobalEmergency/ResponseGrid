import { TransportCapacityId } from './transport-capacity-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import {
  TransportCapacityStatus,
  TransportMode,
  TransportProviderType,
} from './transport-capacity-enums';
import { Capacity, CapacityProps } from './capacity';
import { Coverage, CoverageProps } from './coverage';
import { CapacityWindow, CapacityWindowProps } from './capacity-window';
import {
  CapacityAlreadyWithdrawnError,
  CapacityNotAvailableError,
} from './transport-capacity-errors';

/**
 * Polymorphic reference to whoever offers the capacity. No FK to volunteers or
 * organizations — like grants' principal, the type discriminates the table.
 */
export interface TransportProvider {
  type: TransportProviderType;
  id: string;
}

export interface PublishTransportCapacityProps {
  id: TransportCapacityId;
  emergencyId: EmergencyId;
  provider: TransportProvider;
  mode: TransportMode;
  capacity: Capacity;
  coverage: Coverage;
  window: CapacityWindow;
  constraints: string[];
  notes: string | null;
}

export interface TransportCapacitySnapshot {
  id: string;
  emergencyId: string;
  providerType: TransportProviderType;
  providerId: string;
  mode: TransportMode;
  capacity: CapacityProps;
  coverage: CoverageProps;
  window: CapacityWindowProps;
  constraints: string[];
  status: TransportCapacityStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Aggregate root for a transport-capacity offer: a vehicle/airline/ship offering
 * to MOVE cargo A→B during an emergency. The logistics analogue of
 * {@link DonationOffer} (which offers material, not movement). See #105.
 */
export class TransportCapacity {
  private constructor(
    public readonly id: TransportCapacityId,
    public readonly emergencyId: EmergencyId,
    public readonly provider: TransportProvider,
    public readonly mode: TransportMode,
    public readonly capacity: Capacity,
    public readonly coverage: Coverage,
    public readonly window: CapacityWindow,
    public readonly constraints: string[],
    private _status: TransportCapacityStatus,
    public readonly notes: string | null,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static publish(props: PublishTransportCapacityProps): TransportCapacity {
    const now = new Date();
    return new TransportCapacity(
      props.id,
      props.emergencyId,
      props.provider,
      props.mode,
      props.capacity,
      props.coverage,
      props.window,
      TransportCapacity.normalizeConstraints(props.constraints),
      TransportCapacityStatus.Available,
      props.notes,
      now,
      now,
    );
  }

  static fromSnapshot(s: TransportCapacitySnapshot): TransportCapacity {
    return new TransportCapacity(
      TransportCapacityId.fromString(s.id),
      EmergencyId.fromString(s.emergencyId),
      { type: s.providerType, id: s.providerId },
      s.mode,
      Capacity.create(s.capacity),
      Coverage.fromPlain(s.coverage),
      CapacityWindow.create(s.window),
      [...s.constraints],
      s.status,
      s.notes,
      s.createdAt,
      s.updatedAt,
    );
  }

  private static normalizeConstraints(constraints: string[]): string[] {
    const cleaned = constraints
      .map((c) => c.trim().toLowerCase())
      .filter((c) => c.length > 0);
    return [...new Set(cleaned)];
  }

  get status(): TransportCapacityStatus {
    return this._status;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /** Retires the offer. Must be available (a withdrawn offer can't re-withdraw). */
  withdraw(): void {
    if (this._status === TransportCapacityStatus.Withdrawn) {
      throw new CapacityAlreadyWithdrawnError();
    }
    if (this._status !== TransportCapacityStatus.Available) {
      throw new CapacityNotAvailableError();
    }
    this._status = TransportCapacityStatus.Withdrawn;
    this._updatedAt = new Date();
  }

  toSnapshot(): TransportCapacitySnapshot {
    return {
      id: this.id.value,
      emergencyId: this.emergencyId.value,
      providerType: this.provider.type,
      providerId: this.provider.id,
      mode: this.mode,
      capacity: this.capacity.toPlain(),
      coverage: this.coverage.toPlain(),
      window: this.window.toPlain(),
      constraints: [...this.constraints],
      status: this._status,
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
