import { OfferId } from './offer-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { OfferStatus } from './offer-enums';
import {
  OfferNotOpenError,
  OfferNotMatchedError,
  OfferCannotBeCancelledError,
  OfferNotEditableError,
  OfferItemsRequiredError,
} from './offer-errors';
import { DomainEvent } from './events/domain-event';
import { OfferCreated } from './events/offer-created.event';
import { OfferMatched } from './events/offer-matched.event';
import { OfferFulfilled } from './events/offer-fulfilled.event';
import { OfferCancelled } from './events/offer-cancelled.event';
import { Location, LocationProps } from '../../../shared/domain/location';
import {
  SupplyLine,
  SupplyLineSnapshot,
} from '../../supplies/domain/supply-line';
import { Author, AuthorSnapshot } from '../../../shared/domain/author';

export interface CreateDonationOfferProps {
  id: OfferId;
  emergencyId: EmergencyId;
  donorUserId: string;
  donorOrganizationId: string | null;
  items: SupplyLine[];
  location: Location;
  targetNeedId: string | null;
  notes: string | null;
  /** Restricted author attribution when filed via integration (#235). */
  author?: Author | null;
}

/** Fields a coordinator may change. Omit a field to keep it. */
export interface EditOfferProps {
  /** Replaces the whole list of supply lines when provided. */
  items?: SupplyLine[];
  notes?: string | null;
}

export interface DonationOfferSnapshot {
  id: string;
  emergencyId: string;
  donorUserId: string;
  donorOrganizationId: string | null;
  items: SupplyLineSnapshot[];
  location: LocationProps;
  targetNeedId: string | null;
  matchedNeedId: string | null;
  status: OfferStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** Optional (legacy-safe) restricted author attribution (#235). */
  author?: AuthorSnapshot | null;
}

/**
 * DonationOffer — what a donor commits to deliver. Like a need or a place's
 * inventory, it is a list of {@link SupplyLine} (the single material-line model
 * owned by the supplies context): name + quantity + unit + category +
 * presentation. The aggregate keeps the offer's lifecycle (open → matched →
 * fulfilled / cancelled); the lines describe the material.
 */
export class DonationOffer {
  private events: DomainEvent[] = [];

  private constructor(
    public readonly id: OfferId,
    public readonly emergencyId: EmergencyId,
    public readonly donorUserId: string,
    public readonly donorOrganizationId: string | null,
    private _items: SupplyLine[],
    public readonly location: Location,
    public readonly targetNeedId: string | null,
    private _matchedNeedId: string | null,
    private _status: OfferStatus,
    private _notes: string | null,
    public readonly createdAt: Date,
    private _updatedAt: Date,
    public readonly author: Author | null,
  ) {}

  static create(props: CreateDonationOfferProps): DonationOffer {
    if (props.items.length === 0) {
      throw new OfferItemsRequiredError();
    }
    const now = new Date();
    const offer = new DonationOffer(
      props.id,
      props.emergencyId,
      props.donorUserId,
      props.donorOrganizationId,
      props.items,
      props.location,
      props.targetNeedId,
      null,
      OfferStatus.Open,
      props.notes,
      now,
      now,
      props.author ?? null,
    );
    offer.events.push(
      new OfferCreated(offer.id.value, {
        emergencyId: offer.emergencyId.value,
        categories: offer.categories,
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
      s.items.map((i) => SupplyLine.fromSnapshot(i)),
      Location.create(s.location),
      s.targetNeedId,
      s.matchedNeedId,
      s.status,
      s.notes,
      s.createdAt,
      s.updatedAt,
      s.author ? Author.fromSnapshot(s.author) : null,
    );
  }

  get status(): OfferStatus {
    return this._status;
  }

  get matchedNeedId(): string | null {
    return this._matchedNeedId;
  }

  get items(): readonly SupplyLine[] {
    return this._items;
  }

  /** Distinct categories present across the offer's lines. */
  get categories(): string[] {
    return [...new Set(this._items.map((i) => i.category))];
  }

  get notes(): string | null {
    return this._notes;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Coordinator edit: correct the offer's lines and/or notes. Only `undefined`
   * props are left untouched (passing `null`/'' to notes clears it). Terminal
   * offers (fulfilled/cancelled) are immutable.
   */
  edit(props: EditOfferProps): void {
    if (
      this._status === OfferStatus.Fulfilled ||
      this._status === OfferStatus.Cancelled
    ) {
      throw new OfferNotEditableError();
    }
    if (props.items !== undefined) {
      if (props.items.length === 0) throw new OfferItemsRequiredError();
      this._items = props.items;
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
      items: this._items.map((i) => i.toSnapshot()),
      location: this.location.toPlain(),
      targetNeedId: this.targetNeedId,
      matchedNeedId: this._matchedNeedId,
      status: this._status,
      notes: this._notes,
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
      author: this.author ? this.author.toSnapshot() : null,
    };
  }

  pullDomainEvents(): DomainEvent[] {
    const drained = this.events;
    this.events = [];
    return drained;
  }
}
