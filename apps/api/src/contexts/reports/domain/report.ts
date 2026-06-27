import * as crypto from 'node:crypto';
import { Location, LocationProps } from '../../../shared/domain/location';
import {
  ReportType,
  ReportPriority,
  ReportStatus,
  DamageLevel,
  StructuralDetail,
  STRUCTURAL_TYPES,
} from './report-enums';
import { Priority } from '../../../shared/domain/priority';
import {
  ReportAlreadyReviewedError,
  ReportNotPublishableError,
  ReportNotInReviewedStatusError,
  ReportStructuralDetailRequiredError,
} from './report-errors';

export interface ReportSnapshot {
  id: string;
  emergencyId: string;
  resourceId: string | null;
  reporterUserId: string;
  type: ReportType;
  note: string;
  photoUrls: string[];
  priority: ReportPriority;
  status: ReportStatus;
  location: LocationProps | null;
  createdAt: Date;
  reviewedAt: Date | null;
  // Structural SAR fields (nullable; only meaningful for structural types)
  damageLevel: DamageLevel | null;
  trappedPersonsEstimate: number | null;
  accessibleForRescue: boolean | null;
  buildingType: string | null;
  publishedAt: Date | null;
  publishNote: string | null;
}

export interface CreateReportProps {
  emergencyId: string;
  resourceId?: string | null;
  reporterUserId: string;
  type: ReportType;
  note: string;
  photoUrls?: string[];
  priority: ReportPriority;
  location?: LocationProps | null;
  structuralDetail?: StructuralDetail | null;
}

export class Report {
  private constructor(
    public readonly id: string,
    public readonly emergencyId: string,
    public readonly resourceId: string | null,
    public readonly reporterUserId: string,
    public readonly type: ReportType,
    public readonly note: string,
    public readonly photoUrls: string[],
    private _priority: ReportPriority,
    private _status: ReportStatus,
    public readonly location: Location | null,
    public readonly createdAt: Date,
    private _reviewedAt: Date | null,
    // Structural SAR fields
    public readonly damageLevel: DamageLevel | null,
    public readonly trappedPersonsEstimate: number | null,
    public readonly accessibleForRescue: boolean | null,
    public readonly buildingType: string | null,
    private _publishedAt: Date | null,
    private _publishNote: string | null,
  ) {}

  static create(props: CreateReportProps): Report {
    const isStructural = STRUCTURAL_TYPES.has(props.type);

    // Validate: structuralDetail only allowed for structural types
    if (!isStructural && props.structuralDetail) {
      throw new ReportStructuralDetailRequiredError(props.type);
    }

    let effectivePriority = props.priority;

    // Auto-elevate priority for trapped_persons or collapsed damage
    if (
      props.type === ReportType.TrappedPersons ||
      props.structuralDetail?.damageLevel === DamageLevel.Collapsed
    ) {
      effectivePriority = Priority.Urgent;
    }

    const detail = isStructural ? (props.structuralDetail ?? null) : null;

    return new Report(
      crypto.randomUUID(),
      props.emergencyId,
      props.resourceId ?? null,
      props.reporterUserId,
      props.type,
      props.note,
      props.photoUrls ?? [],
      effectivePriority,
      ReportStatus.Open,
      props.location ? Location.create(props.location) : null,
      new Date(),
      null,
      detail?.damageLevel ?? null,
      detail?.trappedPersonsEstimate ?? null,
      detail?.accessibleForRescue ?? null,
      detail?.buildingType ?? null,
      null,
      null,
    );
  }

  static fromSnapshot(s: ReportSnapshot): Report {
    return new Report(
      s.id,
      s.emergencyId,
      s.resourceId,
      s.reporterUserId,
      s.type,
      s.note,
      s.photoUrls,
      s.priority,
      s.status,
      s.location ? Location.create(s.location) : null,
      s.createdAt,
      s.reviewedAt,
      s.damageLevel,
      s.trappedPersonsEstimate,
      s.accessibleForRescue,
      s.buildingType,
      s.publishedAt,
      s.publishNote,
    );
  }

  get status(): ReportStatus {
    return this._status;
  }

  get priority(): ReportPriority {
    return this._priority;
  }

  get reviewedAt(): Date | null {
    return this._reviewedAt;
  }

  get publishedAt(): Date | null {
    return this._publishedAt;
  }

  get publishNote(): string | null {
    return this._publishNote;
  }

  markReviewed(): void {
    if (this._status === ReportStatus.Reviewed) {
      throw new ReportAlreadyReviewedError(this.id);
    }
    this._status = ReportStatus.Reviewed;
    this._reviewedAt = new Date();
  }

  publish(publishNote?: string): void {
    if (this._status === ReportStatus.Published) {
      throw new ReportNotPublishableError(this.id, 'already published');
    }
    if (this._status !== ReportStatus.Reviewed) {
      throw new ReportNotInReviewedStatusError(this.id, this._status);
    }
    this._status = ReportStatus.Published;
    this._publishedAt = new Date();
    this._publishNote = publishNote ?? null;
  }

  close(): void {
    this._status = ReportStatus.Closed;
  }

  toSnapshot(): ReportSnapshot {
    return {
      id: this.id,
      emergencyId: this.emergencyId,
      resourceId: this.resourceId,
      reporterUserId: this.reporterUserId,
      type: this.type,
      note: this.note,
      photoUrls: this.photoUrls,
      priority: this._priority,
      status: this._status,
      location: this.location ? this.location.toPlain() : null,
      createdAt: this.createdAt,
      reviewedAt: this._reviewedAt,
      damageLevel: this.damageLevel,
      trappedPersonsEstimate: this.trappedPersonsEstimate,
      accessibleForRescue: this.accessibleForRescue,
      buildingType: this.buildingType,
      publishedAt: this._publishedAt,
      publishNote: this._publishNote,
    };
  }
}
