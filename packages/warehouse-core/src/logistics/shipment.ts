import { ShipmentId } from './shipment-id.js';
import { ScopeId } from '../kernel/index.js';
import { CarrierType, ShipmentStatus } from './shipment-enums.js';
import { SupplyLine, SupplyLineSnapshot } from '../kernel/index.js';
import {
  InvalidShipmentRouteError,
  InvalidShipmentTransitionError,
  ShipmentMustHaveCargoError,
  VehicleShipmentCargoError,
} from './shipment-errors.js';
import { DomainEvent } from '../kernel/index.js';
import { ShipmentDelivered } from './events/shipment-delivered.event.js';

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
  /** Legible/QR "Código Único" of the expedition (`EXP-0001`, #163). */
  code: string;
  scopeId: ScopeId;
  originResourceId: string;
  destinationResourceId: string;
  /** Loose cargo lines (non-palletised material), as the canonical SupplyLine. */
  items: SupplyLine[];
  /** Trackable containers (palet/caja/lote, #140) loaded onto this expedition. */
  containerIds: string[];
  /**
   * Optional logistics hub (#150) this expedition transits — an opaque
   * cross-emergency scope id (no FK). A `hub_manager` grant scoped to it may
   * operate the shipment without coordinating its emergency (§16.3). Defaults
   * to null.
   */
  hubId?: string | null;
  manifest: string | null;
  /**
   * Si está presente, la carga del viaje ES el inventario del vehículo
   * (`Warehouse` kind=vehicle) — `items`/`containerIds` deben ir vacíos (los
   * dos modos son excluyentes, ver {@link VehicleShipmentCargoError}).
   */
  vehicleId?: string | null;
}

export interface ShipmentSnapshot {
  id: string;
  code: string;
  scopeId: string;
  originResourceId: string;
  destinationResourceId: string;
  items: SupplyLineSnapshot[];
  containerIds: string[];
  assignedCapacityId: string | null;
  carrierType: CarrierType | null;
  carrierId: string | null;
  hubId: string | null;
  manifest: string | null;
  status: ShipmentStatus;
  createdAt: Date;
  updatedAt: Date;
  /**
   * Opcional — no-breaking para hosts que aún no persisten la columna
   * `vehicle_id` (frontera 1:1, follow-up de persistencia en ResponseGrid).
   */
  vehicleId?: string | null;
}

/**
 * Aggregate root for a shipment (expedición): the WORK of moving cargo from one
 * resource node to another during an emergency. The logistics counterpart of a
 * {@link TransportCapacity} (which OFFERS movement); a shipment is the movement
 * itself, with a status machine and a cargo manifest.
 *
 * Cargo is the canonical material model (#141): a list of {@link SupplyLine}s
 * (loose, non-palletised material) plus a set of {@link Container} ids (the
 * trackable packaging of #140). At least one of the two must be non-empty.
 * Loading/unloading containers is a cross-aggregate move (a Container's holder
 * becomes this shipment, then the destination resource on delivery); the
 * Shipment only records *which* containers it carries.
 *
 * Key decision (#106): ONE aggregate with an OPTIONAL carrier. An internal
 * inventory transfer is a shipment with no `carrierPrincipal`/`assignedCapacityId`;
 * a third-party expedition fills them in via {@link assignCapacity}.
 */
export class Shipment {
  private events: DomainEvent[] = [];

  private constructor(
    public readonly id: ShipmentId,
    public readonly code: string,
    public readonly scopeId: ScopeId,
    public readonly originResourceId: string,
    public readonly destinationResourceId: string,
    public readonly items: SupplyLine[],
    public readonly containerIds: string[],
    private _assignedCapacityId: string | null,
    private _carrier: CarrierPrincipal | null,
    public readonly hubId: string | null,
    public readonly manifest: string | null,
    public readonly vehicleId: string | null,
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
    // Dedupe the container manifest (loading the same container twice is a
    // no-op) and validate each id; a shipment with neither lines nor
    // containers carries nothing.
    const containerIds = [...new Set(props.containerIds)];
    containerIds.forEach((id) => Shipment.assertUuid(id, 'containerId'));
    // Modos excluyentes: en modo vehículo la carga ES el inventario del
    // vehículo, así que la carga suelta debe ir vacía; sin vehículo, se exige
    // el comportamiento actual (al menos una línea o container).
    const vehicleId = props.vehicleId ?? null;
    if (vehicleId !== null) {
      Shipment.assertUuid(vehicleId, 'vehicleId');
      if (props.items.length > 0 || containerIds.length > 0) {
        throw new VehicleShipmentCargoError();
      }
    } else if (props.items.length === 0 && containerIds.length === 0) {
      throw new ShipmentMustHaveCargoError();
    }
    const code = props.code.trim();
    if (code.length === 0) {
      throw new InvalidShipmentRouteError('Shipment code must not be empty');
    }
    const hubId = props.hubId ?? null;
    if (hubId !== null) {
      Shipment.assertUuid(hubId, 'hubId');
    }
    const now = new Date();
    return new Shipment(
      props.id,
      code,
      props.scopeId,
      props.originResourceId,
      props.destinationResourceId,
      [...props.items],
      containerIds,
      null,
      null,
      hubId,
      props.manifest,
      vehicleId,
      ShipmentStatus.Planned,
      now,
      now,
    );
  }

  static fromSnapshot(s: ShipmentSnapshot): Shipment {
    return new Shipment(
      ShipmentId.fromString(s.id),
      s.code,
      ScopeId.fromString(s.scopeId),
      s.originResourceId,
      s.destinationResourceId,
      s.items.map((i) => SupplyLine.fromSnapshot(i)),
      [...s.containerIds],
      s.assignedCapacityId,
      s.carrierType !== null && s.carrierId !== null
        ? { type: s.carrierType, id: s.carrierId }
        : null,
      s.hubId,
      s.manifest,
      s.vehicleId ?? null,
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
        scopeId: this.scopeId.value,
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
      code: this.code,
      scopeId: this.scopeId.value,
      originResourceId: this.originResourceId,
      destinationResourceId: this.destinationResourceId,
      items: this.items.map((i) => i.toSnapshot()),
      containerIds: [...this.containerIds],
      assignedCapacityId: this._assignedCapacityId,
      carrierType: this._carrier?.type ?? null,
      carrierId: this._carrier?.id ?? null,
      hubId: this.hubId,
      manifest: this.manifest,
      vehicleId: this.vehicleId,
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
