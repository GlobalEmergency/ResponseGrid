import { EmergencyId } from '../../../shared/domain/emergency-id';
import { Slug } from './slug';
import { EmergencyStatus } from './emergency-status';
import { InvalidEmergencyTransitionError } from './invalid-emergency-transition.error';
import {
  InvalidDisputeThresholdError,
  MAX_RESOURCE_DISPUTE_THRESHOLD,
} from './invalid-dispute-threshold.error';

export interface CreateEmergencyProps {
  id: EmergencyId;
  name: string;
  slug: Slug;
  country: string;
  dontBringList?: string[];
  announcement?: string | null;
}

export interface EmergencySnapshot {
  id: string;
  name: string;
  slug: string;
  country: string;
  status: EmergencyStatus;
  announcement: string | null;
  dontBringList: string[];
  resourceDisputeThreshold: number | null;
  /** Opt-in policy (#171): auto-resolve a disputed resource on threshold, default off. */
  autoHideOnDispute: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Emergency {
  private constructor(
    public readonly id: EmergencyId,
    public readonly name: string,
    public readonly slug: Slug,
    public readonly country: string,
    private _status: EmergencyStatus,
    private _announcement: string | null,
    private _dontBringList: string[],
    private _resourceDisputeThreshold: number | null,
    private _autoHideOnDispute: boolean,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreateEmergencyProps): Emergency {
    const now = new Date();
    return new Emergency(
      props.id,
      props.name,
      props.slug,
      props.country,
      EmergencyStatus.Active,
      props.announcement ?? null,
      props.dontBringList ?? [],
      null,
      false,
      now,
      now,
    );
  }

  static fromSnapshot(snap: EmergencySnapshot): Emergency {
    return new Emergency(
      EmergencyId.fromString(snap.id),
      snap.name,
      Slug.fromString(snap.slug),
      snap.country,
      snap.status,
      snap.announcement,
      snap.dontBringList,
      snap.resourceDisputeThreshold,
      snap.autoHideOnDispute,
      snap.createdAt,
      snap.updatedAt,
    );
  }

  get status(): EmergencyStatus {
    return this._status;
  }

  get announcement(): string | null {
    return this._announcement;
  }

  get dontBringList(): string[] {
    return this._dontBringList;
  }

  get resourceDisputeThreshold(): number | null {
    return this._resourceDisputeThreshold;
  }

  get autoHideOnDispute(): boolean {
    return this._autoHideOnDispute;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  close(): void {
    this._status = EmergencyStatus.Closed;
    this._updatedAt = new Date();
  }

  pause(): void {
    if (this._status !== EmergencyStatus.Active) {
      throw new InvalidEmergencyTransitionError(this._status, 'paused');
    }
    this._status = EmergencyStatus.Paused;
    this._updatedAt = new Date();
  }

  resume(): void {
    if (this._status !== EmergencyStatus.Paused) {
      throw new InvalidEmergencyTransitionError(this._status, 'active');
    }
    this._status = EmergencyStatus.Active;
    this._updatedAt = new Date();
  }

  publishAnnouncement(text: string): void {
    this._announcement = text;
    this._updatedAt = new Date();
  }

  setResourceDisputeThreshold(threshold: number | null): void {
    if (
      threshold !== null &&
      (!Number.isInteger(threshold) ||
        threshold < 1 ||
        threshold > MAX_RESOURCE_DISPUTE_THRESHOLD)
    ) {
      throw new InvalidDisputeThresholdError(threshold);
    }
    this._resourceDisputeThreshold = threshold;
    this._updatedAt = new Date();
  }

  /**
   * Opt-in per-emergency policy (#171): when enabled, a disputed resource that
   * reaches the dispute threshold is closed automatically (same transition a
   * coordinator's "confirm cierre" performs) instead of just staying visible
   * with a badge. Off by default — must not change behavior for any emergency
   * unless a coordinator explicitly turns it on.
   */
  setAutoHideOnDispute(enabled: boolean): void {
    this._autoHideOnDispute = enabled;
    this._updatedAt = new Date();
  }

  toSnapshot(): EmergencySnapshot {
    return {
      id: this.id.value,
      name: this.name,
      slug: this.slug.value,
      country: this.country,
      status: this._status,
      announcement: this._announcement,
      dontBringList: this._dontBringList,
      resourceDisputeThreshold: this._resourceDisputeThreshold,
      autoHideOnDispute: this._autoHideOnDispute,
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
