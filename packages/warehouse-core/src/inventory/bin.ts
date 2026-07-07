import { BinId } from './bin-id.js';
import { WarehouseId } from './warehouse-id.js';
import { ZoneId } from './zone-id.js';
import { BinKind, BinStatus } from './inventory-enums.js';
import { BinArchivedError, BinValidationError } from './inventory-errors.js';
import { ScopeId } from '../kernel/index.js';

export interface CreateBinProps {
  id: BinId;
  scopeId: ScopeId;
  warehouseId: WarehouseId;
  /** The zone this bin sits in. Null = assigned to the warehouse at large. */
  zoneId?: ZoneId | null;
  code: string;
  kind: BinKind;
}

export interface BinSnapshot {
  id: string;
  scopeId: string;
  warehouseId: string;
  zoneId: string | null;
  code: string;
  kind: BinKind;
  status: BinStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Aggregate root for a bin (ubicación) — a discrete physical location inside a
 * warehouse where stock is put away and picked. Its own root (not part of the
 * {@link Warehouse} aggregate) because bins are numerous and high-write: they
 * will hold {@link StockItem}s and change state independently, so coupling them
 * to the warehouse's load/save would serialize the whole layout.
 *
 * It references its warehouse and (optionally) its zone **by id**. The building
 * a bin belongs to is fixed — you don't move a physical location between
 * warehouses — so `warehouseId` is immutable; the zone assignment can change
 * (a bin re-mapped to another area of the same warehouse). The cross-aggregate
 * invariant "zone belongs to this warehouse and is active" is checked by the
 * application use case (which can load the warehouse); the aggregate guards its
 * local rules: valid code, immutable building, no mutation once archived.
 *
 * Stock is NOT modelled here: {@link StockItem}/{@link StockMovement} (next)
 * reference a bin by id. This is the leaf of the location backbone.
 */
export class Bin {
  private constructor(
    public readonly id: BinId,
    public readonly scopeId: ScopeId,
    public readonly warehouseId: WarehouseId,
    private _zoneId: ZoneId | null,
    public readonly code: string,
    public readonly kind: BinKind,
    private _status: BinStatus,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreateBinProps): Bin {
    const code = props.code.trim();
    if (code.length === 0) {
      throw new BinValidationError('Bin code must not be empty');
    }
    if (code.length > 32) {
      throw new BinValidationError('Bin code must be at most 32 characters');
    }
    const now = new Date();
    return new Bin(
      props.id,
      props.scopeId,
      props.warehouseId,
      props.zoneId ?? null,
      code,
      props.kind,
      BinStatus.Active,
      now,
      now,
    );
  }

  static fromSnapshot(s: BinSnapshot): Bin {
    return new Bin(
      BinId.fromString(s.id),
      ScopeId.fromString(s.scopeId),
      WarehouseId.fromString(s.warehouseId),
      s.zoneId !== null ? ZoneId.fromString(s.zoneId) : null,
      s.code,
      s.kind,
      s.status,
      s.createdAt,
      s.updatedAt,
    );
  }

  get zoneId(): ZoneId | null {
    return this._zoneId;
  }
  get status(): BinStatus {
    return this._status;
  }
  get isActive(): boolean {
    return this._status === BinStatus.Active;
  }
  get isBlocked(): boolean {
    return this._status === BinStatus.Blocked;
  }
  get isArchived(): boolean {
    return this._status === BinStatus.Archived;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  /** Re-maps the bin to another zone of its warehouse (or detaches it). */
  assignZone(zoneId: ZoneId | null): void {
    this.assertNotArchived();
    this._zoneId = zoneId;
    this.touch();
  }

  /** Takes the bin out of service (active → blocked). Idempotent. */
  block(): void {
    this.assertNotArchived();
    if (this._status === BinStatus.Blocked) return;
    this._status = BinStatus.Blocked;
    this.touch();
  }

  /** Returns the bin to service (blocked → active). Idempotent. */
  unblock(): void {
    this.assertNotArchived();
    if (this._status === BinStatus.Active) return;
    this._status = BinStatus.Active;
    this.touch();
  }

  /** Permanently retires the bin. Idempotent; archived is read-only. */
  archive(): void {
    if (this._status === BinStatus.Archived) return;
    this._status = BinStatus.Archived;
    this.touch();
  }

  toSnapshot(): BinSnapshot {
    return {
      id: this.id.value,
      scopeId: this.scopeId.value,
      warehouseId: this.warehouseId.value,
      zoneId: this._zoneId ? this._zoneId.value : null,
      code: this.code,
      kind: this.kind,
      status: this._status,
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
    };
  }

  private assertNotArchived(): void {
    if (this.isArchived) {
      throw new BinArchivedError(
        `Bin ${this.id.value} is archived and cannot be modified`,
      );
    }
  }

  private touch(): void {
    this._updatedAt = new Date();
  }
}
