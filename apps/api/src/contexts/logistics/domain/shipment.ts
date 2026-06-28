import { ShipmentId } from './shipment-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { CarrierType, ShipmentStatus } from './shipment-enums';
import { ShipmentItem, ShipmentItemSnapshot } from './shipment-item';
import {
  InvalidShipmentRouteError,
  InvalidShipmentTransitionError,
  ShipmentMustHaveItemsError,
} from './shipment-errors';
import { DomainEvent } from './events/domain-event';
import { ShipmentDelivered } from './events/shipment-delivered.event';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Polymorphic reference to whoever physically carries the shipment. No FK to
 * volunteers or organizations — like a {@link TransportProvider} or a grant's
 * principal, the type discriminates the table. Null on an internal transfer.
 */
export interface CarrierPrincipal {
  type: CarrierType;
  id: string;
}

export interface CreateShipmentProps {
  id: ShipmentId;
  emergencyId: EmergencyId;
  originResourceId: string;
  destinationResourceId: string;
  items: ShipmentItem[];
  manifest: string | null;
}

export interface ShipmentSnapshot {
  id: string;
  emergencyId: string;
  originResourceId: string;
  destinationResourceId: string;
  items: ShipmentItemSnapshot[];
  assignedCapacityId: string | null;
  carrierType: CarrierType | null;
  carrierId: string | null;
  manifest: string | null;
  status: ShipmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Aggregate root for a shipment (expedición): the WORK of moving cargo from one
 * resource node to another during an emergency. The logistics counterpart of a
 * {@link TransportCapacity} (which OFFERS movement); a shipment is the movement
 * itself, with a status machine and a cargo manifest.
 *
 * Key decision (#106): ONE aggregate with an OPTIONAL carrier. An internal
 * inventory transfer is a shipment with no `carrierPrincipal`/`assignedCapacityId`;
 * a third-party expedition fills them in via {@link assignCapacity}.
 */
export class Shipment {
  private events: DomainEvent[] = [];

  private constructor(
    public readonly id: ShipmentId,
    public readonly emergencyId: EmergencyId,
    public readonly originResourceId: string,
    public readonly destinationResourceId: string,
    public readonly items: ShipmentItem[],
    private _assignedCapacityId: string | null,
    private _carrier: CarrierPrincipal | null,
    public readonly manifest: string | null,
    private _status: ShipmentStatus,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreateShipmentProps): Shipment {
    Shipment.assertUuid(props.originResourceId, 'originResourceId');
    Shipment.assertUuid(props.destinationResourceId, 'destinationResourceId');
    if (props.originResourceId === props.destinationResourceId) {
      throw new InvalidShipmentRouteError(
        'A shipment origin and destination must differ',
      );
    }
    if (props.items.length === 0) {
      throw new ShipmentMustHaveItemsError();
    }
    const now = new Date();
    return new Shipment(
      props.id,
      props.emergencyId,
      props.originResourceId,
      props.destinationResourceId,
      [...props.items],
      null,
      null,
      props.manifest,
      ShipmentStatus.Planned,
      now,
      now,
    );
  }

  static fromSnapshot(s: ShipmentSnapshot): Shipment {
    return new Shipment(
      ShipmentId.fromString(s.id),
      EmergencyId.fromString(s.emergencyId),
      s.originResourceId,
      s.destinationResourceId,
      s.items.map((i) => ShipmentItem.fromSnapshot(i)),
      s.assignedCapacityId,
      s.carrierType !== null && s.carrierId !== null
        ? { type: s.carrierType, id: s.carrierId }
        : null,
      s.manifest,
      s.status,
      s.createdAt,
      s.updatedAt,
    );
  }

  private static assertUuid(value: string, field: string): void {
    if (!UUID_RE.test(value)) {
      throw new InvalidShipmentRouteError(`${field} must be a UUID`);
    }
  }

  get status(): ShipmentStatus {
    return this._status;
  }

  get assignedCapacityId(): string | null {
    return this._assignedCapacityId;
  }

  get carrier(): CarrierPrincipal | null {
    return this._carrier;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Earmarks a TransportCapacity (and, for a third-party expedition, a carrier)
   * for this shipment. planned → assigned. The carrier is optional: an internal
   * transfer keeps it null.
   */
  assignCapacity(capacityId: string, carrier: CarrierPrincipal | null): void {
    this.assertTransition(ShipmentStatus.Assigned, [ShipmentStatus.Planned]);
    Shipment.assertUuid(capacityId, 'assignedCapacityId');
    if (carrier !== null) {
      Shipment.assertUuid(carrier.id, 'carrierId');
    }
    this._assignedCapacityId = capacityId;
    this._carrier = carrier;
    this._status = ShipmentStatus.Assigned;
    this.touch();
  }

  /** assigned → in_transit (the carrier starts the run). */
  markInTransit(): void {
    this.assertTransition(ShipmentStatus.InTransit, [ShipmentStatus.Assigned]);
    this._status = ShipmentStatus.InTransit;
    this.touch();
  }

  /** in_transit → delivered. Emits {@link ShipmentDelivered}. */
  confirmDelivery(): void {
    this.assertTransition(ShipmentStatus.Delivered, [ShipmentStatus.InTransit]);
    this._status = ShipmentStatus.Delivered;
    this.touch();
    this.events.push(
      new ShipmentDelivered(this.id.value, {
        emergencyId: this.emergencyId.value,
        originResourceId: this.originResourceId,
        destinationResourceId: this.destinationResourceId,
        assignedCapacityId: this._assignedCapacityId,
        carrierType: this._carrier?.type ?? null,
        carrierId: this._carrier?.id ?? null,
      }),
    );
  }

  /** in_transit → failed (a started run could not be completed). */
  markFailed(): void {
    this.assertTransition(ShipmentStatus.Failed, [ShipmentStatus.InTransit]);
    this._status = ShipmentStatus.Failed;
    this.touch();
  }

  /** planned|assigned → cancelled (called off before transit). */
  cancel(): void {
    this.assertTransition(ShipmentStatus.Cancelled, [
      ShipmentStatus.Planned,
      ShipmentStatus.Assigned,
    ]);
    this._status = ShipmentStatus.Cancelled;
    this.touch();
  }

  private assertTransition(to: ShipmentStatus, from: ShipmentStatus[]): void {
    if (!from.includes(this._status)) {
      throw new InvalidShipmentTransitionError(this._status, to);
    }
  }

  private touch(): void {
    this._updatedAt = new Date();
  }

  toSnapshot(): ShipmentSnapshot {
    return {
      id: this.id.value,
      emergencyId: this.emergencyId.value,
      originResourceId: this.originResourceId,
      destinationResourceId: this.destinationResourceId,
      items: this.items.map((i) => i.toSnapshot()),
      assignedCapacityId: this._assignedCapacityId,
      carrierType: this._carrier?.type ?? null,
      carrierId: this._carrier?.id ?? null,
      manifest: this.manifest,
      status: this._status,
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
