import { StockItemId } from './stock-item-id.js';
import { WarehouseId } from './warehouse-id.js';
import { BinId } from './bin-id.js';
import { Quantity } from './quantity.js';
import { Lot } from './lot.js';
import { StockStatus } from './stock-enums.js';
import {
  InsufficientStockError,
  StockValidationError,
} from './stock-errors.js';
import { ScopeId } from '../kernel/index.js';

export interface LotInput {
  code: string;
  expiresAt?: Date | null;
}

export interface CreateStockItemProps {
  id: StockItemId;
  scopeId: ScopeId;
  warehouseId: WarehouseId;
  binId: BinId;
  /** The catalog product (Supply) this stock is of, referenced by id. */
  supplyId: string;
  /** The batch, or null for non-lot-tracked stock. */
  lot?: LotInput | null;
  quantity: Quantity;
  status: StockStatus;
}

export interface StockItemSnapshot {
  id: string;
  scopeId: string;
  warehouseId: string;
  binId: string;
  supplyId: string;
  lotCode: string | null;
  expiresAt: Date | null;
  quantityAmount: number;
  unit: string;
  status: StockStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Aggregate root for a unit of existence — the material actually present, at
 * the grain **product × lot × bin × status**: one row per (supply, lot, bin,
 * status), holding a decimal {@link Quantity}. This grain is what lets the WMS
 * do FEFO (each lot its own expiry), multi-location stock (same product in many
 * bins) and status-partitioned holds (available vs quarantine…) without a
 * parallel model.
 *
 * The grain fields — `supplyId`, `binId`, `lot`, `status` — are the item's
 * identity and are **immutable**: moving stock (bin→bin, available→reserved,
 * relabelling a lot) is a transfer between two items (decrease one, increase
 * another), recorded by a {@link StockMovement} (next increment). Only the
 * quantity mutates here, guarded so it never goes negative and always shares
 * the item's unit. Every mutation bumps `version` for optimistic concurrency:
 * the repository writes with a `WHERE version = :expected` and rejects a stale
 * update.
 *
 * References its warehouse/bin and its catalog product **by id** (`scopeId`
 * denormalized for tenancy queries). The kardex, put-away rules and allocation
 * live above this aggregate; here we guard the local invariant: quantity ≥ 0,
 * single unit, immutable grain.
 */
export class StockItem {
  private constructor(
    public readonly id: StockItemId,
    public readonly scopeId: ScopeId,
    public readonly warehouseId: WarehouseId,
    public readonly binId: BinId,
    public readonly supplyId: string,
    public readonly lot: Lot | null,
    public readonly status: StockStatus,
    private _quantity: Quantity,
    private _version: number,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(props: CreateStockItemProps): StockItem {
    const supplyId =
      typeof props.supplyId === 'string' ? props.supplyId.trim() : '';
    if (supplyId.length === 0) {
      throw new StockValidationError('StockItem supplyId must not be empty');
    }
    const lot =
      props.lot != null
        ? Lot.of(props.lot.code, props.lot.expiresAt ?? null)
        : null;
    const now = new Date();
    return new StockItem(
      props.id,
      props.scopeId,
      props.warehouseId,
      props.binId,
      supplyId,
      lot,
      props.status,
      props.quantity,
      1,
      now,
      now,
    );
  }

  static fromSnapshot(s: StockItemSnapshot): StockItem {
    const lot =
      s.lotCode !== null ? Lot.of(s.lotCode, s.expiresAt ?? null) : null;
    return new StockItem(
      StockItemId.fromString(s.id),
      ScopeId.fromString(s.scopeId),
      WarehouseId.fromString(s.warehouseId),
      BinId.fromString(s.binId),
      s.supplyId,
      lot,
      s.status,
      Quantity.of(s.quantityAmount, s.unit),
      s.version,
      s.createdAt,
      s.updatedAt,
    );
  }

  get quantity(): Quantity {
    return this._quantity;
  }
  get unit(): string {
    return this._quantity.unit;
  }
  get version(): number {
    return this._version;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }
  get expiresAt(): Date | null {
    return this.lot?.expiresAt ?? null;
  }

  /** True when this item's lot has an expiry at or before the given instant. */
  isExpiredAt(instant: Date): boolean {
    return this.lot?.isExpiredAt(instant) ?? false;
  }

  /** Adds stock (a receipt or an incoming transfer leg). Same unit required. */
  increase(quantity: Quantity): void {
    this._quantity = this._quantity.plus(quantity);
    this.bump();
  }

  /**
   * Removes stock (an issue/consumption or an outgoing transfer leg). Throws
   * {@link InsufficientStockError} if the item holds less than requested.
   */
  decrease(quantity: Quantity): void {
    if (this._quantity.isLessThan(quantity)) {
      throw new InsufficientStockError(
        `StockItem ${this.id.value} holds ${this._quantity.amount} ${this.unit}, cannot remove ${quantity.amount}`,
      );
    }
    this._quantity = this._quantity.minus(quantity);
    this.bump();
  }

  /** Sets the quantity to an absolute value (cycle count / recuento). */
  adjustTo(quantity: Quantity): void {
    if (quantity.unit !== this.unit) {
      throw new StockValidationError(
        `Cannot adjust "${this.unit}" stock to a "${quantity.unit}" quantity`,
      );
    }
    this._quantity = quantity;
    this.bump();
  }

  toSnapshot(): StockItemSnapshot {
    return {
      id: this.id.value,
      scopeId: this.scopeId.value,
      warehouseId: this.warehouseId.value,
      binId: this.binId.value,
      supplyId: this.supplyId,
      lotCode: this.lot?.code ?? null,
      expiresAt: this.lot?.expiresAt ?? null,
      quantityAmount: this._quantity.amount,
      unit: this._quantity.unit,
      status: this.status,
      version: this._version,
      createdAt: this.createdAt,
      updatedAt: this._updatedAt,
    };
  }

  private bump(): void {
    this._version += 1;
    this._updatedAt = new Date();
  }
}
