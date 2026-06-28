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
} from './resource-errors';
import { DomainEvent } from './events/domain-event';
import { ResourceRegistered } from './events/resource-registered';
import { ResourceVerified } from './events/resource-verified';
import { ResourcePublished } from './events/resource-published';
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
}

export class Resource {
  private events: DomainEvent[] = [];

  private constructor(
    public readonly id: ResourceId,
    public readonly emergencyId: EmergencyId,
    public readonly type: ResourceType,
    public readonly stage: ResourceStage,
    public readonly name: string,
    public readonly description: string | null,
    public readonly location: Location,
    public readonly ownerUserId: string,
    public readonly ownerOrganizationId: string | null,
    private _verificationLevel: VerificationLevel,
    private _publicStatus: PublicStatus,
    public readonly createdAt: Date,
    public readonly contact: string | null,
    public readonly schedule: string | null,
    public readonly manager: string | null,
    public readonly accepts: string[],
    public readonly country: string | null,
    public readonly city: string | null,
    public readonly provenance: Provenance | null,
    public readonly isFinalRecipient: boolean,
    public readonly recipientType: string | null,
    public readonly items: SupplyLine[],
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
    );
  }

  get verificationLevel(): VerificationLevel {
    return this._verificationLevel;
  }
  get publicStatus(): PublicStatus {
    return this._publicStatus;
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
    if (this._verificationLevel === VerificationLevel.Unverified) {
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
    };
  }

  pullDomainEvents(): DomainEvent[] {
    const drained = this.events;
    this.events = [];
    return drained;
  }
}
