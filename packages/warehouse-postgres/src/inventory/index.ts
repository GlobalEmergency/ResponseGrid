/**
 * inventory — capa de persistencia Postgres/Drizzle del módulo `inventory` de
 * warehouse-core. Esquema dedicado `wms.`, runner de migraciones propio y los
 * adaptadores de los 4 puertos (warehouse/bin/stock-item/stock-movement).
 *
 * Consumible por cualquier host (ResponseGrid o el WMS standalone) sin acoplarse
 * a él: sólo depende de warehouse-core y de drizzle/pg.
 */
export {
  wms,
  warehousesTable,
  zonesTable,
  binsTable,
  stockItemsTable,
  stockMovementsTable,
} from './schema.js';
export {
  rowToZoneSnapshot,
  rowsToWarehouseSnapshot,
  warehouseSnapshotToRow,
  zoneSnapshotToRow,
  rowToBinSnapshot,
  binSnapshotToRow,
  rowToStockItemSnapshot,
  stockItemSnapshotToRow,
  rowToStockMovementSnapshot,
  stockMovementSnapshotToRow,
} from './mappers.js';
export { DrizzleWarehouseRepository } from './drizzle-warehouse.repository.js';
export { DrizzleBinRepository } from './drizzle-bin.repository.js';
export { DrizzleStockItemRepository } from './drizzle-stock-item.repository.js';
export { DrizzleStockMovementRepository } from './drizzle-stock-movement.repository.js';
export { StaleStockItemError } from './stock-persistence-errors.js';
export { migrateWms } from './migrate.js';
