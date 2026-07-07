/**
 * inventory — el backbone de ubicaciones del WMS nuevo (Fase 2). Aggregate
 * root `Warehouse` (almacén) con sus entidades `Zone` (áreas: recepción/
 * almacenaje/picking/expedición/cuarentena), sobre `ScopeId` (tenencia opaca).
 *
 * Dominio puro: sin NestJS, sin ORM, sin infraestructura. Los `Bin` y el stock
 * (`StockItem`/`StockMovement`) llegan en incrementos siguientes y referencian
 * este backbone por id.
 */
export { WarehouseId } from './warehouse-id.js';
export { ZoneId } from './zone-id.js';
export { WarehouseStatus, ZoneStatus, ZoneKind } from './inventory-enums.js';
export {
  WarehouseValidationError,
  DuplicateZoneCodeError,
  WarehouseArchivedError,
} from './inventory-errors.js';
export { Warehouse, Zone } from './warehouse.js';
export type {
  WarehouseGeo,
  AddZoneProps,
  CreateWarehouseProps,
  ZoneSnapshot,
  WarehouseSnapshot,
} from './warehouse.js';
export {
  WAREHOUSE_REPOSITORY,
  type WarehouseRepository,
  type ListWarehousesFilter,
} from './ports/warehouse.repository.js';
