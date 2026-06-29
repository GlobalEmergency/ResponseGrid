import { NeedId } from './need-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { Priority, NeedStatus, PersonnelSkill } from './need-enums';
import {
  NeedNotPendingError,
  NeedNotEditableError,
  NeedTitleRequiredError,
} from './need-errors';
import { DomainEvent } from './events/domain-event';
import { NeedCreated } from './events/need-created.event';
import { NeedValidated } from './events/need-validated.event';
import { NeedRejected } from './events/need-rejected.event';
import { Location, LocationProps } from '../../../shared/domain/location';
import {
  SupplyLine,
  SupplyLineSnapshot,
} from '../../supplies/domain/supply-line';
import { LocationSensitivity } from '../../../shared/domain/location-sensitivity';
import { Author, AuthorSnapshot } from '../../../shared/domain/author';

/** Hours a validated need stays visible before it expires. */
export const NEED_VALIDITY_HOURS = 48;

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
  /** Default: 'public'. Use CreateNeed use case to get the correct auto-derived value. */
  locationSensitivity?: LocationSensitivity;
  items: SupplyLine[];
  /** F05: optional personnel-need fields */
  requiredSkill?: PersonnelSkill | null;
  skillSpecialty?: string | null;
  requestedCount?: number | null;
  /** Optional link to the resource / final recipient this need belongs to (#60). */
  resourceId?: string | null;
  /**
   * Optional self-reported contact of the real person this need was filed on
   * behalf of, when created by a trusted integration via API key (#235).
   * RESTRICTED — never exposed on public reads.
   */
  author?: Author | null;
}

/** Fields a coordinator may change while validating. Omit a field to keep it. */
export interface EditNeedProps {
  title?: string;
  description?: string | null;
  priority?: Priority;
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
  /** Optional for backwards compatibility with legacy snapshots. Default: 'public'. */
  locationSensitivity?: LocationSensitivity;
  items: SupplyLineSnapshot[];
  status: NeedStatus;
  createdAt: Date;
  expiresAt: Date | null;
  lastVerifiedAt: Date | null;
  /** F05: optional personnel-need fields */
  requiredSkill?: PersonnelSkill | null;
  skillSpecialty?: string | null;
  requestedCount?: number | null;
  /** Optional (legacy-safe) link to the resource / final recipient (#60). */
  resourceId?: string | null;
  /** Optional (legacy-safe) restricted author attribution (#235). */
  author?: AuthorSnapshot | null;
}

export class Need {
  private events: DomainEvent[] = [];

  private constructor(
    public readonly id: NeedId,
    public readonly emergencyId: EmergencyId,
    private _title: string,
    private _description: string | null,
    public readonly location: Location,
    private _priority: Priority,
    public readonly requesterUserId: string,
    public readonly requesterOrganizationId: string | null,
    private _managingOrganizationId: string | null,
    public readonly locationSensitivity: LocationSensitivity,
    public readonly items: SupplyLine[],
    private _status: NeedStatus,
    public readonly createdAt: Date,
    private _expiresAt: Date | null,
    private _lastVerifiedAt: Date | null,
    /** F05: optional personnel-need fields */
    public readonly requiredSkill: PersonnelSkill | null,
    public readonly skillSpecialty: string | null,
    public readonly requestedCount: number | null,
    public readonly resourceId: string | null,
    public readonly author: Author | null,
  ) {}

  static create(props: CreateNeedProps): Need {
    if (!props.items || props.items.length === 0) {
      throw new NeedItemsRequiredError();
    }
    // Validate requestedCount coherence (if supplied, must be >= 1)
    if (
      props.requestedCount !== undefined &&
      props.requestedCount !== null &&
      props.requestedCount < 1
    ) {
      throw new Error('requestedCount must be >= 1 when provided');
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
      props.locationSensitivity ?? LocationSensitivity.Public,
      props.items,
      NeedStatus.Pending,
      new Date(),
      null,
      null,
      props.requiredSkill ?? null,
      props.skillSpecialty ?? null,
      props.requestedCount ?? null,
      props.resourceId ?? null,
      props.author ?? null,
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
      // Fallback for legacy snapshots that pre-date the locationSensitivity field
      s.locationSensitivity ?? LocationSensitivity.Public,
      s.items.map((i) => SupplyLine.fromSnapshot(i)),
      s.status,
      s.createdAt,
      s.expiresAt ?? null,
      s.lastVerifiedAt ?? null,
      (s.requiredSkill as PersonnelSkill) ?? null,
      s.skillSpecialty ?? null,
      s.requestedCount ?? null,
      s.resourceId ?? null,
      s.author ? Author.fromSnapshot(s.author) : null,
    );
  }

  get title(): string {
    return this._title;
  }

  get description(): string | null {
    return this._description;
  }

  get priority(): Priority {
    return this._priority;
  }

  get status(): NeedStatus {
    return this._status;
  }

  get managingOrganizationId(): string | null {
    return this._managingOrganizationId;
  }

  get expiresAt(): Date | null {
    return this._expiresAt;
  }

  get lastVerifiedAt(): Date | null {
    return this._lastVerifiedAt;
  }

  validate(): void {
    if (this._status !== NeedStatus.Pending) {
      throw new NeedNotPendingError();
    }
    this._status = NeedStatus.Validated;
    const now = new Date();
    this._lastVerifiedAt = now;
    this._expiresAt = new Date(
      now.getTime() + NEED_VALIDITY_HOURS * 60 * 60 * 1000,
    );
    this.events.push(
      new NeedValidated(this.id.value, { emergencyId: this.emergencyId.value }),
    );
  }

  /**
   * Renew: coordinator confirms the need is still active.
   * Resets expiresAt to now + 48 h and updates lastVerifiedAt.
   */
  renew(): void {
    const now = new Date();
    this._lastVerifiedAt = now;
    this._expiresAt = new Date(
      now.getTime() + NEED_VALIDITY_HOURS * 60 * 60 * 1000,
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
   * Coordinator edit during validation: complete or correct the need's core
   * fields. Only `undefined` props are left untouched (passing `null` to
   * `description` clears it). Terminal needs (rejected/fulfilled) are immutable.
   */
  edit(props: EditNeedProps): void {
    if (
      this._status === NeedStatus.Rejected ||
      this._status === NeedStatus.Fulfilled
    ) {
      throw new NeedNotEditableError();
    }
    if (props.title !== undefined) {
      const trimmed = props.title.trim();
      if (trimmed.length === 0) throw new NeedTitleRequiredError();
      this._title = trimmed;
    }
    if (props.description !== undefined) {
      const next =
        props.description === null ? null : props.description.trim() || null;
      this._description = next;
    }
    if (props.priority !== undefined) {
      this._priority = props.priority;
    }
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
      locationSensitivity: this.locationSensitivity,
      items: this.items.map((i) => i.toSnapshot()),
      status: this._status,
      createdAt: this.createdAt,
      expiresAt: this._expiresAt,
      lastVerifiedAt: this._lastVerifiedAt,
      requiredSkill: this.requiredSkill,
      skillSpecialty: this.skillSpecialty,
      requestedCount: this.requestedCount,
      resourceId: this.resourceId,
      author: this.author ? this.author.toSnapshot() : null,
    };
  }

  pullDomainEvents(): DomainEvent[] {
    const drained = this.events;
    this.events = [];
    return drained;
  }
}
