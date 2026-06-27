import { SightingId } from './sighting-id';
import { Location, LocationProps } from '../../../shared/domain/location';

export interface SightingSnapshot {
  id: string;
  reportedByUserId: string | null;
  reportedByName: string | null;
  location: string;
  coords: LocationProps | null;
  note: string;
  reportedAt: Date;
}

export interface RegisterSightingProps {
  id: SightingId;
  reportedByUserId: string | null;
  reportedByName: string | null;
  location: string;
  coords: LocationProps | null;
  note: string;
}

export class Sighting {
  readonly id: SightingId;
  readonly reportedByUserId: string | null;
  readonly reportedByName: string | null;
  readonly location: string;
  readonly coords: Location | null;
  readonly note: string;
  readonly reportedAt: Date;

  private constructor(
    id: SightingId,
    reportedByUserId: string | null,
    reportedByName: string | null,
    location: string,
    coords: Location | null,
    note: string,
    reportedAt: Date,
  ) {
    this.id = id;
    this.reportedByUserId = reportedByUserId;
    this.reportedByName = reportedByName;
    this.location = location;
    this.coords = coords;
    this.note = note;
    this.reportedAt = reportedAt;
  }

  static register(props: RegisterSightingProps): Sighting {
    const coords = props.coords ? Location.create(props.coords) : null;
    return new Sighting(
      props.id,
      props.reportedByUserId ?? null,
      props.reportedByName ?? null,
      props.location.trim(),
      coords,
      props.note.trim(),
      new Date(),
    );
  }

  static fromSnapshot(s: SightingSnapshot): Sighting {
    const coords = s.coords ? Location.create(s.coords) : null;
    return new Sighting(
      SightingId.fromString(s.id),
      s.reportedByUserId,
      s.reportedByName,
      s.location,
      coords,
      s.note,
      s.reportedAt,
    );
  }

  toSnapshot(): SightingSnapshot {
    return {
      id: this.id.value,
      reportedByUserId: this.reportedByUserId,
      reportedByName: this.reportedByName,
      location: this.location,
      coords: this.coords ? this.coords.toPlain() : null,
      note: this.note,
      reportedAt: this.reportedAt,
    };
  }
}
