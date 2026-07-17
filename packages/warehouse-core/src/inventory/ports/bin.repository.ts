import { Bin } from '../bin.js';
import { BinId } from '../bin-id.js';
import { WarehouseId } from '../warehouse-id.js';
import { ScopeId } from '../../kernel/index.js';
import { BinKind, BinStatus } from '../inventory-enums.js';

export const BIN_REPOSITORY = Symbol('BinRepository');

/** Filter for listing bins. AND-combined. */
export interface ListBinsFilter {
  status?: BinStatus;
  kind?: BinKind;
  /** Only bins mapped to this zone. */
  zoneId?: string;
}

export interface BinRepository {
  save(bin: Bin): Promise<void>;
  findById(id: BinId): Promise<Bin | null>;
  /**
   * Resolves a bin by its code within a warehouse. Codes are unique per
   * warehouse (the caller/DB enforces it); used to reject duplicates on create
   * and to look a bin up by its label.
   */
  findByCode(warehouseId: WarehouseId, code: string): Promise<Bin | null>;
  findByWarehouse(
    warehouseId: WarehouseId,
    filter: ListBinsFilter,
  ): Promise<Bin[]>;
  /** All bins in a tenancy scope (denormalized `scopeId`), for cross-warehouse listing. */
  findByScope(scopeId: ScopeId, filter: ListBinsFilter): Promise<Bin[]>;
}
