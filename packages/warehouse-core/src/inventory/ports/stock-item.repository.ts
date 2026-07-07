import { StockItem } from '../stock-item.js';
import { StockItemId } from '../stock-item-id.js';
import { BinId } from '../bin-id.js';
import { WarehouseId } from '../warehouse-id.js';
import { ScopeId } from '../../kernel/index.js';
import { StockStatus } from '../stock-enums.js';

export const STOCK_ITEM_REPOSITORY = Symbol('StockItemRepository');

/** Filter for listing stock. AND-combined. */
export interface ListStockFilter {
  status?: StockStatus;
  supplyId?: string;
}

/**
 * The business grain key of a {@link StockItem}: the unique combination
 * (bin, supply, lot, status). `lotCode` is null for non-lot-tracked stock. The
 * receipt path resolves the existing row by this key to add to it, or creates a
 * new item when absent.
 */
export interface StockGrainKey {
  binId: string;
  supplyId: string;
  lotCode: string | null;
  status: StockStatus;
}

export interface StockItemRepository {
  /**
   * Persists the item. Implementations MUST enforce optimistic concurrency on
   * `version` (write `WHERE version = snapshot.version - 1`) and reject a stale
   * update, and MUST uphold the unique grain key (bin, supply, lot, status).
   */
  save(item: StockItem): Promise<void>;
  findById(id: StockItemId): Promise<StockItem | null>;
  /** Resolves the single item at a grain key, or null if none exists yet. */
  findByGrain(key: StockGrainKey): Promise<StockItem | null>;
  findByBin(binId: BinId, filter: ListStockFilter): Promise<StockItem[]>;
  findByWarehouse(
    warehouseId: WarehouseId,
    filter: ListStockFilter,
  ): Promise<StockItem[]>;
  findByScope(scopeId: ScopeId, filter: ListStockFilter): Promise<StockItem[]>;
}
