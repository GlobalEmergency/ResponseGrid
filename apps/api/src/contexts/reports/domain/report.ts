import * as crypto from 'node:crypto';
import { Location, LocationProps } from '../../../shared/domain/location';
import { ReportType, ReportPriority, ReportStatus } from './report-enums';
import { ReportAlreadyReviewedError } from './report-errors';

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
  ) {}

  static create(props: CreateReportProps): Report {
    return new Report(
      crypto.randomUUID(),
      props.emergencyId,
      props.resourceId ?? null,
      props.reporterUserId,
      props.type,
      props.note,
      props.photoUrls ?? [],
      props.priority,
      ReportStatus.Open,
      props.location ? Location.create(props.location) : null,
      new Date(),
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

  markReviewed(): void {
    if (this._status === ReportStatus.Reviewed) {
      throw new ReportAlreadyReviewedError(this.id);
    }
    this._status = ReportStatus.Reviewed;
    this._reviewedAt = new Date();
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
    };
  }
}
