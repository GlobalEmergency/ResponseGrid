import { ValidityReportNotOpenError } from './resource-errors';

/** Why a citizen reports a collection point as no longer valid. */
export enum ValidityReason {
  /** Exists but no longer operating / receiving. */
  Closed = 'closed',
  /** Gone or never was at this location. */
  Nonexistent = 'nonexistent',
  /** Still active but relocated, or the marked address is wrong. */
  Moved = 'moved',
  /** Schedule, contact or accepted items are out of date. */
  Outdated = 'outdated',
}

/** Lifecycle of a single citizen report, set when a coordinator resolves it. */
export enum ValidityReportStatus {
  Open = 'open',
  /** Coordinator agreed (the resource was closed/marked invalid). */
  Accepted = 'accepted',
  /** Coordinator dismissed the report (the resource stays active). */
  Dismissed = 'dismissed',
}

export interface ResourceValidityReportSnapshot {
  id: string;
  resourceId: string;
  emergencyId: string;
  reporterUserId: string;
  reason: ValidityReason;
  note: string | null;
  photoUrls: string[];
  status: ValidityReportStatus;
  createdAt: Date;
  resolvedByUserId: string | null;
  resolvedAt: Date | null;
}

export interface OpenValidityReportProps {
  id: string;
  resourceId: string;
  emergencyId: string;
  reporterUserId: string;
  reason: ValidityReason;
  note?: string | null;
  photoUrls?: string[];
}

export interface UpdateValidityReportProps {
  reason: ValidityReason;
  note?: string | null;
  photoUrls?: string[];
}

/**
 * A citizen's report that a published resource is no longer valid. One **open**
 * report per (resource, reporter) — a fresh report from the same user updates
 * theirs rather than adding a vote (enforced by a unique partial index in the
 * DB and by the upsert in `ReportResourceValidity`). Distinct open reports are
 * what drive a resource to `disputed`.
 */
export class ResourceValidityReport {
  private constructor(
    public readonly id: string,
    public readonly resourceId: string,
    public readonly emergencyId: string,
    public readonly reporterUserId: string,
    private _reason: ValidityReason,
    private _note: string | null,
    private _photoUrls: string[],
    private _status: ValidityReportStatus,
    public readonly createdAt: Date,
    private _resolvedByUserId: string | null,
    private _resolvedAt: Date | null,
  ) {}

  static open(props: OpenValidityReportProps): ResourceValidityReport {
    return new ResourceValidityReport(
      props.id,
      props.resourceId,
      props.emergencyId,
      props.reporterUserId,
      props.reason,
      props.note != null ? props.note.trim() || null : null,
      props.photoUrls ?? [],
      ValidityReportStatus.Open,
      new Date(),
      null,
      null,
    );
  }

  static fromSnapshot(
    s: ResourceValidityReportSnapshot,
  ): ResourceValidityReport {
    return new ResourceValidityReport(
      s.id,
      s.resourceId,
      s.emergencyId,
      s.reporterUserId,
      s.reason,
      s.note,
      s.photoUrls ?? [],
      s.status,
      s.createdAt,
      s.resolvedByUserId,
      s.resolvedAt,
    );
  }

  get reason(): ValidityReason {
    return this._reason;
  }
  get note(): string | null {
    return this._note;
  }
  get photoUrls(): string[] {
    return this._photoUrls;
  }
  get status(): ValidityReportStatus {
    return this._status;
  }
  get resolvedByUserId(): string | null {
    return this._resolvedByUserId;
  }
  get resolvedAt(): Date | null {
    return this._resolvedAt;
  }

  /** Re-report by the same user: refresh their open report (no new vote). */
  update(props: UpdateValidityReportProps): void {
    if (this._status !== ValidityReportStatus.Open) {
      throw new ValidityReportNotOpenError();
    }
    this._reason = props.reason;
    if (props.note !== undefined) {
      this._note = props.note === null ? null : props.note.trim() || null;
    }
    if (props.photoUrls !== undefined) {
      this._photoUrls = props.photoUrls;
    }
  }

  /** Coordinator agreed with the report (resource closed/marked invalid). */
  accept(coordinatorId: string): void {
    this.resolve(ValidityReportStatus.Accepted, coordinatorId);
  }

  /** Coordinator dismissed the report (resource stays active). */
  dismiss(coordinatorId: string): void {
    this.resolve(ValidityReportStatus.Dismissed, coordinatorId);
  }

  private resolve(status: ValidityReportStatus, coordinatorId: string): void {
    if (this._status !== ValidityReportStatus.Open) {
      throw new ValidityReportNotOpenError();
    }
    this._status = status;
    this._resolvedByUserId = coordinatorId;
    this._resolvedAt = new Date();
  }

  toSnapshot(): ResourceValidityReportSnapshot {
    return {
      id: this.id,
      resourceId: this.resourceId,
      emergencyId: this.emergencyId,
      reporterUserId: this.reporterUserId,
      reason: this._reason,
      note: this._note,
      photoUrls: this._photoUrls,
      status: this._status,
      createdAt: this.createdAt,
      resolvedByUserId: this._resolvedByUserId,
      resolvedAt: this._resolvedAt,
    };
  }
}
