/**
 * inventory — el backbone de ubicaciones del WMS nuevo (Fase 2). Aggregate
 * root `Warehouse` (almacén) con sus entidades `Zone` (áreas: recepción/
 * almacenaje/picking/expedición/cuarentena) y el aggregate root `Bin`
 * (ubicación física), sobre `ScopeId` (tenencia opaca).
 *
 * El stock existente se modela con `StockItem` (una fila por producto × lote ×
 * bin × estado, con cantidad decimal + UoM y `version` para concurrencia
 * optimista) y su libro mayor `StockMovement` (asiento inmutable de doble pata:
 * `applyStockMovement` decrementa un item e incrementa otro). `allocateFefo`
 * planifica el reparto de una demanda por caducidad (first-expired-first-out).
 *
 * Dominio puro: sin NestJS, sin ORM, sin infraestructura. Todo referencia el
 * catálogo (`supplyId`) y el backbone (bin → zona → almacén) por id.
 */
export { WarehouseId } from './warehouse-id.js';
export { ZoneId } from './zone-id.js';
export { BinId } from './bin-id.js';
export { StockItemId } from './stock-item-id.js';
export { StockMovementId } from './stock-movement-id.js';
export {
  WarehouseStatus,
  ZoneStatus,
  ZoneKind,
  BinStatus,
  BinKind,
} from './inventory-enums.js';
export { StockStatus } from './stock-enums.js';
export { MovementKind } from './movement-enums.js';
export {
  WarehouseValidationError,
  DuplicateZoneCodeError,
  WarehouseArchivedError,
  BinValidationError,
  BinArchivedError,
} from './inventory-errors.js';
export {
  StockValidationError,
  QuantityUnitMismatchError,
  InsufficientStockError,
  StockMovementValidationError,
} from './stock-errors.js';
export { Quantity } from './quantity.js';
export { Lot } from './lot.js';
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
export { StockItem } from './stock-item.js';
export type {
  LotInput,
  CreateStockItemProps,
  StockItemSnapshot,
} from './stock-item.js';
export { StockMovement, applyStockMovement } from './stock-movement.js';
export type {
  RecordStockMovementProps,
  StockMovementSnapshot,
  MovementLegs,
} from './stock-movement.js';
export { allocateFefo } from './fefo-allocation.js';
export type {
  FefoDemand,
  FefoOptions,
  AllocationLine,
  AllocationPlan,
} from './fefo-allocation.js';
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
export {
  STOCK_ITEM_REPOSITORY,
  type StockItemRepository,
  type ListStockFilter,
  type StockGrainKey,
} from './ports/stock-item.repository.js';
export {
  STOCK_MOVEMENT_REPOSITORY,
  type StockMovementRepository,
  type ListMovementsFilter,
} from './ports/stock-movement.repository.js';
