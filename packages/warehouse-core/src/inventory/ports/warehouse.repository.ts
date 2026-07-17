import { Warehouse } from '../warehouse.js';
import { WarehouseId } from '../warehouse-id.js';
import { ScopeId } from '../../kernel/index.js';
import { WarehouseStatus } from '../inventory-enums.js';

export const WAREHOUSE_REPOSITORY = Symbol('WarehouseRepository');

/** Filter for listing warehouses within a scope. AND-combined. */
export interface ListWarehousesFilter {
  status?: WarehouseStatus;
}

export interface WarehouseRepository {
  save(warehouse: Warehouse): Promise<void>;
  findById(id: WarehouseId): Promise<Warehouse | null>;
  /**
   * Resolves a warehouse by its human code within a scope. Codes are unique per
   * scope (the caller/DB enforces it); used to reject duplicates on create and
   * to look a warehouse up by its label.
   */
  findByCode(scopeId: ScopeId, code: string): Promise<Warehouse | null>;
  findByScope(
    scopeId: ScopeId,
    filter: ListWarehousesFilter,
  ): Promise<Warehouse[]>;
}
