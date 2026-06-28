import { OfferId } from './offer-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { Category, OfferStatus } from './offer-enums';
import {
  OfferNotOpenError,
  OfferNotMatchedError,
  OfferCannotBeCancelledError,
  OfferNotEditableError,
  OfferDescriptionRequiredError,
  OfferQuantityInvalidError,
} from './offer-errors';
import { DomainEvent } from './events/domain-event';
import { OfferCreated } from './events/offer-created.event';
import { OfferMatched } from './events/offer-matched.event';
import { OfferFulfilled } from './events/offer-fulfilled.event';
import { OfferCancelled } from './events/offer-cancelled.event';
import { Location, LocationProps } from '../../../shared/domain/location';

export interface CreateDonationOfferProps {
  id: OfferId;
  emergencyId: EmergencyId;
  donorUserId: string;
  donorOrganizationId: string | null;
  category: Category;
  description: string;
  quantity: number;
  unit: string | null;
  location: Location;
  targetNeedId: string | null;
  notes: string | null;
}

/** Fields a coordinator may change. Omit a field to keep it. */
export interface EditOfferProps {
  description?: string;
  quantity?: number;
  unit?: string | null;
  notes?: string | null;
}

export interface DonationOfferSnapshot {
  id: string;
  emergencyId: string;
  donorUserId: string;
  donorOrganizationId: string | null;
  category: Category;
  description: string;
  quantity: number;
  unit: string | null;
  location: LocationProps;
  targetNeedId: string | null;
  matchedNeedId: string | null;
  status: OfferStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class DonationOffer {
  private events: DomainEvent[] = [];

  private constructor(
    public readonly id: OfferId,
    public readonly emergencyId: EmergencyId,
    public readonly donorUserId: string,
    public readonly donorOrganizationId: string | null,
    public readonly category: Category,
    private _description: string,
    private _quantity: number,
    private _unit: string | null,
    public readonly location: Location,
    public readonly targetNeedId: string | null,
    private _matchedNeedId: string | null,
    private _status: OfferStatus,
    private _notes: string | null,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreateDonationOfferProps): DonationOffer {
    if (props.quantity <= 0) {
      throw new Error('Offer quantity must be greater than 0');
    }
    const now = new Date();
    const offer = new DonationOffer(
      props.id,
      props.emergencyId,
      props.donorUserId,
      props.donorOrganizationId,
      props.category,
      props.description,
      props.quantity,
      props.unit,
      props.location,
      props.targetNeedId,
      null,
      OfferStatus.Open,
      props.notes,
      now,
      now,
    );
    offer.events.push(
      new OfferCreated(offer.id.value, {
        emergencyId: offer.emergencyId.value,
        category: offer.category,
      }),
    );
    return offer;
  }

  static fromSnapshot(s: DonationOfferSnapshot): DonationOffer {
    return new DonationOffer(
      OfferId.fromString(s.id),
      EmergencyId.fromString(s.emergencyId),
      s.donorUserId,
      s.donorOrganizationId,
      s.category,
      s.description,
      s.quantity,
      s.unit,
      Location.create(s.location),
      s.targetNeedId,
      s.matchedNeedId,
      s.status,
      s.notes,
      s.createdAt,
      s.updatedAt,
    );
  }

  get status(): OfferStatus {
    return this._status;
  }

  get matchedNeedId(): string | null {
    return this._matchedNeedId;
  }

  get description(): string {
    return this._description;
  }

  get quantity(): number {
    return this._quantity;
  }

  get unit(): string | null {
    return this._unit;
  }

  get notes(): string | null {
    return this._notes;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Coordinator edit: complete or correct the offer's core fields. Only
   * `undefined` props are left untouched (passing `null`/'' to unit/notes clears
   * them). Terminal offers (fulfilled/cancelled) are immutable.
   */
  edit(props: EditOfferProps): void {
    if (
      this._status === OfferStatus.Fulfilled ||
      this._status === OfferStatus.Cancelled
    ) {
      throw new OfferNotEditableError();
    }
    if (props.description !== undefined) {
      const trimmed = props.description.trim();
      if (trimmed.length === 0) throw new OfferDescriptionRequiredError();
      this._description = trimmed;
    }
    if (props.quantity !== undefined) {
      if (props.quantity <= 0) throw new OfferQuantityInvalidError();
      this._quantity = props.quantity;
    }
    if (props.unit !== undefined) {
      this._unit = props.unit === null ? null : props.unit.trim() || null;
    }
    if (props.notes !== undefined) {
      this._notes = props.notes === null ? null : props.notes.trim() || null;
    }
    this._updatedAt = new Date();
  }

  /** Assigns this offer to a need. Offer must be Open. */
  matchTo(needId: string): void {
    if (this._status !== OfferStatus.Open) {
      throw new OfferNotOpenError();
    }
    this._status = OfferStatus.Matched;
    this._matchedNeedId = needId;
    this._updatedAt = new Date();
    this.events.push(
      new OfferMatched(this.id.value, {
        emergencyId: this.emergencyId.value,
        needId,
      }),
    );
  }

  /** Marks offer as fulfilled. Must be Matched. */
  markFulfilled(): void {
    if (this._status !== OfferStatus.Matched) {
      throw new OfferNotMatchedError();
    }
    this._status = OfferStatus.Fulfilled;
    this._updatedAt = new Date();
    this.events.push(
      new OfferFulfilled(this.id.value, {
        emergencyId: this.emergencyId.value,
      }),
    );
  }

  /** Cancels the offer. Must be Open or Matched. */
  cancel(): void {
    if (
      this._status !== OfferStatus.Open &&
      this._status !== OfferStatus.Matched
    ) {
      throw new OfferCannotBeCancelledError(this._status);
    }
    this._status = OfferStatus.Cancelled;
    this._updatedAt = new Date();
    this.events.push(
      new OfferCancelled(this.id.value, {
        emergencyId: this.emergencyId.value,
      }),
    );
  }

  toSnapshot(): DonationOfferSnapshot {
    return {
      id: this.id.value,
      emergencyId: this.emergencyId.value,
      donorUserId: this.donorUserId,
      donorOrganizationId: this.donorOrganizationId,
      category: this.category,
      description: this.description,
      quantity: this.quantity,
      unit: this.unit,
      location: this.location.toPlain(),
      targetNeedId: this.targetNeedId,
      matchedNeedId: this._matchedNeedId,
      status: this._status,
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
    };
  }

  pullDomainEvents(): DomainEvent[] {
    const drained = this.events;
    this.events = [];
    return drained;
  }
}
