import { MissingPersonReportId } from './missing-person-report-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { PersonData, PersonDataProps } from './person-data';
import { ReporterInfo, ReporterInfoProps } from './reporter-info';
import {
  MissingPersonStatus,
  assertValidTransition,
} from './missing-person-status';
import { Sighting, SightingSnapshot } from './sighting';
import { SightingId } from './sighting-id';
import {
  ConsentRequiredError,
  SightingsClosedError,
} from './missing-person-report-errors';
import { LocationProps } from '../../../shared/domain/location';

export interface CreateMissingPersonReportProps {
  id: MissingPersonReportId;
  emergencyId: EmergencyId;
  person: PersonDataProps;
  reporter: ReporterInfoProps;
  consentGiven: boolean;
}

export interface MissingPersonReportSnapshot {
  id: string;
  emergencyId: string;
  person: PersonDataProps;
  reporter: ReporterInfoProps;
  status: MissingPersonStatus;
  consentGiven: boolean;
  photoUrl: string | null;
  sightings: SightingSnapshot[];
  createdAt: Date;
  updatedAt: Date;
  reviewedByUserId: string | null;
  matchNote: string | null;
}

export class MissingPersonReport {
  private _status: MissingPersonStatus;
  private _sightings: Sighting[];
  private _updatedAt: Date;
  private _reviewedByUserId: string | null;
  private _matchNote: string | null;
  private _photoUrl: string | null;

  private constructor(
    public readonly id: MissingPersonReportId,
    public readonly emergencyId: EmergencyId,
    public readonly person: PersonData,
    public readonly reporter: ReporterInfo,
    status: MissingPersonStatus,
    public readonly consentGiven: boolean,
    photoUrl: string | null,
    sightings: Sighting[],
    public readonly createdAt: Date,
    updatedAt: Date,
    reviewedByUserId: string | null,
    matchNote: string | null,
  ) {
    this._status = status;
    this._sightings = sightings;
    this._updatedAt = updatedAt;
    this._reviewedByUserId = reviewedByUserId;
    this._matchNote = matchNote;
    this._photoUrl = photoUrl;
  }

  get status(): MissingPersonStatus {
    return this._status;
  }
  get sightings(): Sighting[] {
    return [...this._sightings];
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
  get reviewedByUserId(): string | null {
    return this._reviewedByUserId;
  }
  get matchNote(): string | null {
    return this._matchNote;
  }
  get photoUrl(): string | null {
    return this._photoUrl;
  }

  static create(props: CreateMissingPersonReportProps): MissingPersonReport {
    if (!props.consentGiven) {
      throw new ConsentRequiredError();
    }
    const now = new Date();
    return new MissingPersonReport(
      props.id,
      props.emergencyId,
      PersonData.create(props.person),
      ReporterInfo.create(props.reporter),
      MissingPersonStatus.Open,
      true,
      null,
      [],
      now,
      now,
      null,
      null,
    );
  }

  static fromSnapshot(s: MissingPersonReportSnapshot): MissingPersonReport {
    return new MissingPersonReport(
      MissingPersonReportId.fromString(s.id),
      EmergencyId.fromString(s.emergencyId),
      PersonData.create(s.person),
      ReporterInfo.create(s.reporter),
      s.status,
      s.consentGiven,
      s.photoUrl,
      s.sightings.map((sn) => Sighting.fromSnapshot(sn)),
      s.createdAt,
      s.updatedAt,
      s.reviewedByUserId,
      s.matchNote,
    );
  }

  addSighting(props: {
    id: SightingId;
    reportedByUserId: string | null;
    reportedByName: string | null;
    location: string;
    coords: LocationProps | null;
    note: string;
  }): Sighting {
    const closedStatuses: MissingPersonStatus[] = [
      MissingPersonStatus.Matched,
      MissingPersonStatus.Closed,
    ];
    if (closedStatuses.includes(this._status)) {
      throw new SightingsClosedError(this._status);
    }
    const sighting = Sighting.register(props);
    this._sightings.push(sighting);
    this._updatedAt = new Date();
    return sighting;
  }

  updateStatus(
    newStatus: MissingPersonStatus,
    reviewedByUserId: string,
    matchNote?: string,
  ): void {
    assertValidTransition(this._status, newStatus);
    this._status = newStatus;
    this._reviewedByUserId = reviewedByUserId;
    this._matchNote = matchNote ?? this._matchNote;
    this._updatedAt = new Date();
  }

  toSnapshot(): MissingPersonReportSnapshot {
    return {
      id: this.id.value,
      emergencyId: this.emergencyId.value,
      person: this.person.toPlain(),
      reporter: this.reporter.toPlain(),
      status: this._status,
      consentGiven: this.consentGiven,
      photoUrl: this._photoUrl,
      sightings: this._sightings.map((s) => s.toSnapshot()),
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
      reviewedByUserId: this._reviewedByUserId,
      matchNote: this._matchNote,
    };
  }
}
