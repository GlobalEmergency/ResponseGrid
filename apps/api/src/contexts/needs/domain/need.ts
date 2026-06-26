import { NeedId } from './need-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { Priority, NeedStatus } from './need-enums';
import { NeedNotPendingError } from './need-errors';
import { DomainEvent } from './events/domain-event';
import { NeedCreated } from './events/need-created.event';
import { NeedValidated } from './events/need-validated.event';
import { NeedRejected } from './events/need-rejected.event';
import { Location, LocationProps } from '../../../shared/domain/location';
import { NeedItem, NeedItemSnapshot } from './need-item';

export class NeedItemsRequiredError extends Error {
  constructor() {
    super('A need must have at least one item');
    this.name = 'NeedItemsRequiredError';
  }
}

export interface CreateNeedProps {
  id: NeedId;
  emergencyId: EmergencyId;
  title: string;
  description: string | null;
  location: Location;
  priority: Priority;
  requesterUserId: string;
  requesterOrganizationId: string | null;
  items: NeedItem[];
}

export interface NeedSnapshot {
  id: string;
  emergencyId: string;
  title: string;
  description: string | null;
  location: LocationProps;
  priority: Priority;
  requesterUserId: string;
  requesterOrganizationId: string | null;
  managingOrganizationId: string | null;
  items: NeedItemSnapshot[];
  status: NeedStatus;
  createdAt: Date;
}

export class Need {
  private events: DomainEvent[] = [];

  private constructor(
    public readonly id: NeedId,
    public readonly emergencyId: EmergencyId,
    public readonly title: string,
    public readonly description: string | null,
    public readonly location: Location,
    public readonly priority: Priority,
    public readonly requesterUserId: string,
    public readonly requesterOrganizationId: string | null,
    private _managingOrganizationId: string | null,
    public readonly items: NeedItem[],
    private _status: NeedStatus,
    public readonly createdAt: Date,
  ) {}

  static create(props: CreateNeedProps): Need {
    if (!props.items || props.items.length === 0) {
      throw new NeedItemsRequiredError();
    }
    const need = new Need(
      props.id,
      props.emergencyId,
      props.title,
      props.description,
      props.location,
      props.priority,
      props.requesterUserId,
      props.requesterOrganizationId,
      null,
      props.items,
      NeedStatus.Pending,
      new Date(),
    );
    need.events.push(
      new NeedCreated(need.id.value, {
        emergencyId: need.emergencyId.value,
        priority: need.priority,
      }),
    );
    return need;
  }

  static fromSnapshot(s: NeedSnapshot): Need {
    return new Need(
      NeedId.fromString(s.id),
      EmergencyId.fromString(s.emergencyId),
      s.title,
      s.description,
      Location.create(s.location),
      s.priority,
      s.requesterUserId,
      s.requesterOrganizationId,
      s.managingOrganizationId,
      s.items.map(NeedItem.fromSnapshot),
      s.status,
      s.createdAt,
    );
  }

  get status(): NeedStatus {
    return this._status;
  }

  get managingOrganizationId(): string | null {
    return this._managingOrganizationId;
  }

  validate(): void {
    if (this._status !== NeedStatus.Pending) {
      throw new NeedNotPendingError();
    }
    this._status = NeedStatus.Validated;
    this.events.push(
      new NeedValidated(this.id.value, { emergencyId: this.emergencyId.value }),
    );
  }

  reject(): void {
    if (this._status !== NeedStatus.Pending) {
      throw new NeedNotPendingError();
    }
    this._status = NeedStatus.Rejected;
    this.events.push(
      new NeedRejected(this.id.value, { emergencyId: this.emergencyId.value }),
    );
  }

  /**
   * Assigns the organization responsible for managing this need.
   * Can be called at any status — coordinators may assign a manager before or after validation.
   */
  assignManager(organizationId: string): void {
    this._managingOrganizationId = organizationId;
  }

  /**
   * Marks the need as fulfilled (closed). Represents completion of the request
   * and is useful for metrics / reporting. Can only be called on a validated need.
   */
  close(): void {
    if (this._status !== NeedStatus.Validated) {
      throw new Error('Only validated needs can be closed (fulfilled)');
    }
    this._status = NeedStatus.Fulfilled;
  }

  toSnapshot(): NeedSnapshot {
    return {
      id: this.id.value,
      emergencyId: this.emergencyId.value,
      title: this.title,
      description: this.description,
      location: this.location.toPlain(),
      priority: this.priority,
      requesterUserId: this.requesterUserId,
      requesterOrganizationId: this.requesterOrganizationId,
      managingOrganizationId: this._managingOrganizationId,
      items: this.items.map((i) => i.toSnapshot()),
      status: this._status,
      createdAt: this.createdAt,
    };
  }

  pullDomainEvents(): DomainEvent[] {
    const drained = this.events;
    this.events = [];
    return drained;
  }
}
