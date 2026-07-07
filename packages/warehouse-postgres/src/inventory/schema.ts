import {
  pgSchema,
  uuid,
  text,
  timestamp,
  doublePrecision,
  integer,
  numeric,
} from 'drizzle-orm/pg-core';

/**
 * Esquema Postgres dedicado del WMS. Aísla las tablas del módulo `inventory` en
 * `wms.` para que warehouse-postgres pueda migrar y convivir con el host sin
 * colisionar con sus tablas. Refleja `migrations/wms_0001_inventory.sql` (la
 * fuente de verdad del DDL; este objeto sólo describe las columnas para el
 * query builder tipado de Drizzle).
 */
export const wms = pgSchema('wms');

/** Almacén (agregado raíz). `code` único por scope. */
export const warehousesTable = wms.table('warehouses', {
  id: uuid('id').primaryKey(),
  scopeId: uuid('scope_id').notNull(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  address: text('address'),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

/**
 * Zona (entidad del agregado Warehouse). FK a `warehouses` con borrado en
 * cascada. `code` único por almacén.
 */
export const zonesTable = wms.table('zones', {
  id: uuid('id').primaryKey(),
  warehouseId: uuid('warehouse_id').notNull(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  kind: text('kind').notNull(),
  status: text('status').notNull(),
});

/**
 * Ubicación física (agregado propio). Referencia almacén y (opcionalmente) zona
 * por id; `scope_id` denormalizado para listados por scope.
 */
export const binsTable = wms.table('bins', {
  id: uuid('id').primaryKey(),
  scopeId: uuid('scope_id').notNull(),
  warehouseId: uuid('warehouse_id').notNull(),
  zoneId: uuid('zone_id'),
  code: text('code').notNull(),
  kind: text('kind').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

/**
 * Unidad de existencia (agregado raíz). Grano producto × lote × bin × estado.
 * `quantityAmount` es `numeric(18,6)`: Drizzle lo devuelve como string, así que
 * el mapper lo convierte a number con cuidado (evita el 500 por `.toISOString`
 * y afines del gotcha de SQL crudo). `version` para concurrencia optimista.
 */
export const stockItemsTable = wms.table('stock_items', {
  id: uuid('id').primaryKey(),
  scopeId: uuid('scope_id').notNull(),
  warehouseId: uuid('warehouse_id').notNull(),
  binId: uuid('bin_id').notNull(),
  supplyId: uuid('supply_id').notNull(),
  lotCode: text('lot_code'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  quantityAmount: numeric('quantity_amount', {
    precision: 18,
    scale: 6,
  }).notNull(),
  unit: text('unit').notNull(),
  status: text('status').notNull(),
  version: integer('version').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

/**
 * Libro mayor (kardex). Append-only. Asiento de doble pata: `fromItemId` y
 * `toItemId` (cada una una StockItem o el exterior=null).
 */
export const stockMovementsTable = wms.table('stock_movements', {
  id: uuid('id').primaryKey(),
  scopeId: uuid('scope_id').notNull(),
  kind: text('kind').notNull(),
  quantityAmount: numeric('quantity_amount', {
    precision: 18,
    scale: 6,
  }).notNull(),
  unit: text('unit').notNull(),
  fromItemId: uuid('from_item_id'),
  toItemId: uuid('to_item_id'),
  reason: text('reason'),
  idempotencyKey: text('idempotency_key'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
});
