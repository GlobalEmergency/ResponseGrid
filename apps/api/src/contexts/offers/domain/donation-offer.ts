import { OfferId } from './offer-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { Category, OfferStatus } from './offer-enums';
import {
  OfferNotOpenError,
  OfferNotMatchedError,
  OfferCannotBeCancelledError,
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
    public readonly description: string,
    public readonly quantity: number,
    public readonly unit: string | null,
    public readonly location: Location,
    public readonly targetNeedId: string | null,
    private _matchedNeedId: string | null,
    private _status: OfferStatus,
    public readonly notes: string | null,
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

  get updatedAt(): Date {
    return this._updatedAt;
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
