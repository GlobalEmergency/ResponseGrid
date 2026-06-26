import { EmergencyId } from '../../../shared/domain/emergency-id';
import { Slug } from './slug';
import { EmergencyStatus } from './emergency-status';

export interface CreateEmergencyProps {
  id: EmergencyId;
  name: string;
  slug: Slug;
  country: string;
}

export interface EmergencySnapshot {
  id: string;
  name: string;
  slug: string;
  country: string;
  status: EmergencyStatus;
  createdAt: Date;
}

export class Emergency {
  private constructor(
    public readonly id: EmergencyId,
    public readonly name: string,
    public readonly slug: Slug,
    public readonly country: string,
    private _status: EmergencyStatus,
    public readonly createdAt: Date,
  ) {}

  static create(props: CreateEmergencyProps): Emergency {
    return new Emergency(
      props.id,
      props.name,
      props.slug,
      props.country,
      EmergencyStatus.Active,
      new Date(),
    );
  }

  static fromSnapshot(snap: EmergencySnapshot): Emergency {
    return new Emergency(
      EmergencyId.fromString(snap.id),
      snap.name,
      Slug.fromString(snap.slug),
      snap.country,
      snap.status,
      snap.createdAt,
    );
  }

  get status(): EmergencyStatus {
    return this._status;
  }

  close(): void {
    this._status = EmergencyStatus.Closed;
  }

  toSnapshot(): EmergencySnapshot {
    return {
      id: this.id.value,
      name: this.name,
      slug: this.slug.value,
      country: this.country,
      status: this._status,
      createdAt: this.createdAt,
    };
  }
}
