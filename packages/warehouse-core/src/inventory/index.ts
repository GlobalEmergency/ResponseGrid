/**
 * inventory — el backbone de ubicaciones del WMS nuevo (Fase 2). Aggregate
 * root `Warehouse` (almacén) con sus entidades `Zone` (áreas: recepción/
 * almacenaje/picking/expedición/cuarentena) y el aggregate root `Bin`
 * (ubicación física), sobre `ScopeId` (tenencia opaca).
 *
 * Dominio puro: sin NestJS, sin ORM, sin infraestructura. El stock
 * (`StockItem`/`StockMovement`) llega en incrementos siguientes y referencia
 * este backbone por id (bin → zona → almacén).
 */
export { WarehouseId } from './warehouse-id.js';
export { ZoneId } from './zone-id.js';
export { BinId } from './bin-id.js';
export {
  WarehouseStatus,
  ZoneStatus,
  ZoneKind,
  BinStatus,
  BinKind,
} from './inventory-enums.js';
export {
  WarehouseValidationError,
  DuplicateZoneCodeError,
  WarehouseArchivedError,
  BinValidationError,
  BinArchivedError,
} from './inventory-errors.js';
export { Warehouse, Zone } from './warehouse.js';
export type {
  WarehouseGeo,
  AddZoneProps,
  CreateWarehouseProps,
  ZoneSnapshot,
  WarehouseSnapshot,
} from './warehouse.js';
export { Bin } from './bin.js';
export type { CreateBinProps, BinSnapshot } from './bin.js';
export {
  WAREHOUSE_REPOSITORY,
  type WarehouseRepository,
  type ListWarehousesFilter,
} from './ports/warehouse.repository.js';
export {
  BIN_REPOSITORY,
  type BinRepository,
  type ListBinsFilter,
} from './ports/bin.repository.js';
