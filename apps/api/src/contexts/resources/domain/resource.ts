import { ResourceId } from './resource-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import {
  ResourceType,
  ResourceStage,
  VerificationLevel,
  PublicStatus,
} from './resource-enums';
import { Location, LocationProps } from '../../../shared/domain/location';
import {
  InvalidVerificationLevelError,
  InvalidPublicStatusTransitionError,
  ResourceAlreadyPublishedError,
  ResourceNotPublishedError,
  ResourceNotVerifiedError,
  FinalRecipientMustBeDestinationError,
  ResourceNotPendingError,
  ResourceNotEditableError,
  ResourceNameRequiredError,
  ResourceNotDisputableError,
} from './resource-errors';
import { DomainEvent } from './events/domain-event';
import { ResourceRegistered } from './events/resource-registered';
import { ResourceVerified } from './events/resource-verified';
import { ResourcePublished } from './events/resource-published';
import { ResourceDisputed } from './events/resource-disputed';
import { ResourceDisputeResolved } from './events/resource-dispute-resolved';
import {
  SupplyLine,
  SupplyLineSnapshot,
} from '../../supplies/domain/supply-line';

export type Provenance = {
  sourceName: string;
  externalId: string;
  externalUpdatedAt: Date | null;
  raw: unknown;
};

export interface RegisterResourceProps {
  id: ResourceId;
  emergencyId: EmergencyId;
  type: ResourceType;
  stage: ResourceStage;
  name: string;
  description?: string | null;
  location: Location;
  ownerUserId: string;
  ownerOrganizationId?: string | null;
  // enriched optional fields
  contact?: string | null;
  schedule?: string | null;
  manager?: string | null;
  accepts?: string[];
  country?: string | null;
  city?: string | null;
  provenance?: Provenance | null;
  // destinatario final (#60)
  isFinalRecipient?: boolean;
  recipientType?: string | null;
  // inventario declarado del lugar (qué material tiene para entregar)
  items?: SupplyLine[];
}

/** Fields a coordinator may change while verifying. Omit a field to keep it. */
export interface EditResourceProps {
  name?: string;
  description?: string | null;
  contact?: string | null;
  schedule?: string | null;
}

// Snapshot used by repositories to rehydrate without going through register().
export interface ResourceSnapshot {
  id: string;
  emergencyId: string;
  type: ResourceType;
  stage: ResourceStage;
  name: string;
  description: string | null;
  location: LocationProps;
  ownerUserId: string;
  ownerOrganizationId: string | null;
  verificationLevel: VerificationLevel;
  publicStatus: PublicStatus;
  createdAt: Date;
  // enriched fields
  contact: string | null;
  schedule: string | null;
  manager: string | null;
  accepts: string[];
  country: string | null;
  city: string | null;
  provenance: Provenance | null;
  isFinalRecipient: boolean;
  recipientType: string | null;
  items: SupplyLineSnapshot[];
  disputed?: boolean;
  disputedAt?: Date | null;
}

export class Resource {
  private events: DomainEvent[] = [];

  private constructor(
    public readonly id: ResourceId,
    public readonly emergencyId: EmergencyId,
    public readonly type: ResourceType,
    public readonly stage: ResourceStage,
    private _name: string,
    private _description: string | null,
    public readonly location: Location,
    public readonly ownerUserId: string,
    public readonly ownerOrganizationId: string | null,
    private _verificationLevel: VerificationLevel,
    private _publicStatus: PublicStatus,
    public readonly createdAt: Date,
    private _contact: string | null,
    private _schedule: string | null,
    public readonly manager: string | null,
    public readonly accepts: string[],
    public readonly country: string | null,
    public readonly city: string | null,
    public readonly provenance: Provenance | null,
    public readonly isFinalRecipient: boolean,
    public readonly recipientType: string | null,
    private _items: SupplyLine[],
    private _disputed: boolean,
    private _disputedAt: Date | null,
  ) {}

  static register(props: RegisterResourceProps): Resource {
    if (
      (props.isFinalRecipient ?? false) &&
      props.stage !== ResourceStage.Destination
    ) {
      throw new FinalRecipientMustBeDestinationError(props.stage);
    }
    const r = new Resource(
      props.id,
      props.emergencyId,
      props.type,
      props.stage,
      props.name,
      props.description ?? null,
      props.location,
      props.ownerUserId,
      props.ownerOrganizationId ?? null,
      VerificationLevel.Unverified,
      PublicStatus.Hidden,
      new Date(),
      props.contact ?? null,
      props.schedule ?? null,
      props.manager ?? null,
      props.accepts ?? [],
      props.country ?? null,
      props.city ?? null,
      props.provenance ?? null,
      props.isFinalRecipient ?? false,
      props.recipientType ?? null,
      props.items ?? [],
      false,
      null,
    );
    r.events.push(
      new ResourceRegistered(r.id.value, {
        emergencyId: r.emergencyId.value,
        type: r.type,
        stage: r.stage,
        name: r.name,
      }),
    );
    return r;
  }

  static fromSnapshot(s: ResourceSnapshot): Resource {
    return new Resource(
      ResourceId.fromString(s.id),
      EmergencyId.fromString(s.emergencyId),
      s.type,
      s.stage,
      s.name,
      s.description,
      Location.create(s.location),
      s.ownerUserId,
      s.ownerOrganizationId,
      s.verificationLevel,
      s.publicStatus,
      s.createdAt,
      s.contact ?? null,
      s.schedule ?? null,
      s.manager ?? null,
      s.accepts ?? [],
      s.country ?? null,
      s.city ?? null,
      s.provenance ?? null,
      s.isFinalRecipient ?? false,
      s.recipientType ?? null,
      (s.items ?? []).map((i) => SupplyLine.fromSnapshot(i)),
      s.disputed ?? false,
      s.disputedAt ?? null,
    );
  }

  get name(): string {
    return this._name;
  }
  get description(): string | null {
    return this._description;
  }
  get contact(): string | null {
    return this._contact;
  }
  get schedule(): string | null {
    return this._schedule;
  }
  get verificationLevel(): VerificationLevel {
    return this._verificationLevel;
  }
  get publicStatus(): PublicStatus {
    return this._publicStatus;
  }
  get disputed(): boolean {
    return this._disputed;
  }
  get disputedAt(): Date | null {
    return this._disputedAt;
  }
  /** Declared inventory the place holds for delivery (#28, #129). */
  get items(): SupplyLine[] {
    return this._items;
  }

  verify(level: VerificationLevel, coordinatorId: string): void {
    if (level === VerificationLevel.Unverified) {
      throw new InvalidVerificationLevelError(level);
    }
    this._verificationLevel = level;
    this.events.push(
      new ResourceVerified(this.id.value, {
        emergencyId: this.emergencyId.value,
        level,
        coordinatorId,
      }),
    );
  }

  publish(): void {
    if (
      this._verificationLevel !== VerificationLevel.Verified &&
      this._verificationLevel !== VerificationLevel.Official
    ) {
      throw new ResourceNotVerifiedError();
    }
    if (this._publicStatus !== PublicStatus.Hidden) {
      throw new ResourceAlreadyPublishedError();
    }
    this._publicStatus = PublicStatus.Active;
    this.events.push(
      new ResourcePublished(this.id.value, {
        emergencyId: this.emergencyId.value,
      }),
    );
  }

  /**
   * Transition the public status to a new value.
   *
   * Valid source states: Active, Saturated, Paused, Closed (i.e. resource must
   * be published). Hidden is not a valid source — call publish() first.
   * Target cannot be Hidden (use-case invariant for the operational semaphore).
   * Reopen = Closed → Active.
   */
  changePublicStatus(target: PublicStatus): void {
    if (this._publicStatus === PublicStatus.Hidden) {
      throw new ResourceNotPublishedError();
    }
    if (target === PublicStatus.Hidden) {
      throw new InvalidPublicStatusTransitionError(this._publicStatus, target);
    }
    this._publicStatus = target;
  }

  /**
   * Coordinator/validator edit while verifying: complete or correct the
   * descriptive fields. Omit a field to leave it untouched (passing `null` or
   * an empty string to description/contact/schedule clears it). A discarded
   * resource is immutable.
   */
  edit(props: EditResourceProps): void {
    if (this._verificationLevel === VerificationLevel.Rejected) {
      throw new ResourceNotEditableError();
    }
    if (props.name !== undefined) {
      const trimmed = props.name.trim();
      if (trimmed.length === 0) throw new ResourceNameRequiredError();
      this._name = trimmed;
    }
    if (props.description !== undefined) {
      this._description =
        props.description === null ? null : props.description.trim() || null;
    }
    if (props.contact !== undefined) {
      this._contact =
        props.contact === null ? null : props.contact.trim() || null;
    }
    if (props.schedule !== undefined) {
      this._schedule =
        props.schedule === null ? null : props.schedule.trim() || null;
    }
  }

  /**
   * Merge confirmed donation lines into the declared inventory: lines with the
   * same identity (name + category + unit + presentation) sum their quantities;
   * genuinely new lines are appended. Drives real-time stock when a
   * pre-registered donation is received at the point (#129). Order is stable:
   * existing lines keep their position (with updated quantity), new lines are
   * appended in arrival order.
   */
  receiveInventory(lines: SupplyLine[]): void {
    if (lines.length === 0) return;
    const keyOf = (l: SupplyLine): string =>
      JSON.stringify([l.name, l.category, l.unit, l.presentation]);
    const byKey = new Map<string, SupplyLine>();
    for (const item of this._items) byKey.set(keyOf(item), item);
    for (const incoming of lines) {
      const k = keyOf(incoming);
      const current = byKey.get(k);
      byKey.set(
        k,
        SupplyLine.create({
          name: incoming.name,
          quantity: (current?.quantity ?? 0) + incoming.quantity,
          unit: incoming.unit,
          category: incoming.category,
          presentation: incoming.presentation,
        }),
      );
    }
    this._items = [...byKey.values()];
  }

  /**
   * Discard a resource pending verification: it leaves the verification queue
   * (no longer `unverified`) and can never be published. Only a resource still
   * pending (unverified, not yet published) can be discarded.
   */
  discard(): void {
    if (this._verificationLevel !== VerificationLevel.Unverified) {
      throw new ResourceNotPendingError();
    }
    this._verificationLevel = VerificationLevel.Rejected;
  }

  /**
   * Whether the resource is shown to citizens on the public map/list:
   * Active, Saturated or Paused (i.e. published and not Closed/Hidden).
   */
  isPubliclyVisible(): boolean {
    return (
      this._publicStatus === PublicStatus.Active ||
      this._publicStatus === PublicStatus.Saturated ||
      this._publicStatus === PublicStatus.Paused
    );
  }

  /**
   * Flag the resource as disputed: enough distinct citizens reported it as
   * invalid. It stays visible (still Active/Saturated/Paused) with a warning
   * until a coordinator resolves the dispute. Only a visible (published) point
   * can be disputed. Idempotent: flagging an already-disputed resource is a
   * no-op (no duplicate event, the original disputedAt is kept).
   */
  flagDisputed(): void {
    if (this._disputed) return;
    if (!this.isPubliclyVisible()) {
      throw new ResourceNotDisputableError();
    }
    this._disputed = true;
    this._disputedAt = new Date();
    this.events.push(
      new ResourceDisputed(this.id.value, {
        emergencyId: this.emergencyId.value,
      }),
    );
  }

  /** Clear the disputed flag when a coordinator resolves it. */
  clearDispute(resolution: string): void {
    this._disputed = false;
    this._disputedAt = null;
    this.events.push(
      new ResourceDisputeResolved(this.id.value, {
        emergencyId: this.emergencyId.value,
        resolution,
      }),
    );
  }

  /**
   * Coordinator confirms the resource is invalid (e.g. it never existed):
   * verification level becomes `rejected`, removing it from public listings.
   */
  markInvalid(): void {
    this._verificationLevel = VerificationLevel.Rejected;
  }

  toSnapshot(): ResourceSnapshot {
    return {
      id: this.id.value,
      emergencyId: this.emergencyId.value,
      type: this.type,
      stage: this.stage,
      name: this.name,
      description: this.description,
      location: this.location.toPlain(),
      ownerUserId: this.ownerUserId,
      ownerOrganizationId: this.ownerOrganizationId,
      verificationLevel: this._verificationLevel,
      publicStatus: this._publicStatus,
      createdAt: this.createdAt,
      contact: this.contact,
      schedule: this.schedule,
      manager: this.manager,
      accepts: this.accepts,
      country: this.country,
      city: this.city,
      provenance: this.provenance,
      isFinalRecipient: this.isFinalRecipient,
      recipientType: this.recipientType,
      items: this.items.map((i) => i.toSnapshot()),
      disputed: this._disputed,
      disputedAt: this._disputedAt,
    };
  }

  pullDomainEvents(): DomainEvent[] {
    const drained = this.events;
    this.events = [];
    return drained;
  }
}
