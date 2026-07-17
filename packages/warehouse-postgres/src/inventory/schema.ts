import {
  pgSchema,
  uuid,
  text,
  timestamp,
  doublePrecision,
  integer,
  numeric,
  jsonb,
  primaryKey,
} from 'drizzle-orm/pg-core';
import type { SupplyLineSnapshot } from '@globalemergency/warehouse-core/kernel';

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
  // Naturaleza física (`fixed` | `vehicle`) y carga útil máxima del vehículo.
  // `numeric` llega como string: el mapper lo convierte a number con cuidado.
  kind: text('kind').notNull(),
  maxWeightKg: numeric('max_weight_kg', { precision: 18, scale: 6 }),
  maxVolumeM3: numeric('max_volume_m3', { precision: 18, scale: 6 }),
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
  actorId: text('actor_id'),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
});

/**
 * Unidad de empaquetado rastreable (palet/caja/lote) — agregado `Container`.
 * La composición es por referencia mediante la self-FK `parent_container_id`
 * (ON DELETE SET NULL en el DDL: borrar un padre des-anida a sus hijos). Las
 * líneas de material se guardan como jsonb (`SupplyLineSnapshot[]`), igual que en
 * el host; el holder es polimórfico (resource|shipment) sin FK. Peso/volumen
 * brutos son `double precision` → el mapper los usa como number directo.
 * Refleja `migrations/wms_0003_containers.sql` (fuente de verdad del DDL).
 */
export const containersTable = wms.table('containers', {
  id: uuid('id').primaryKey(),
  scopeId: uuid('scope_id').notNull(),
  code: text('code').notNull(),
  type: text('type').notNull(),
  parentContainerId: uuid('parent_container_id'),
  lines: jsonb('lines').$type<SupplyLineSnapshot[]>().notNull(),
  grossWeightKg: doublePrecision('gross_weight_kg'),
  grossVolumeM3: doublePrecision('gross_volume_m3'),
  holderType: text('holder_type'),
  holderId: uuid('holder_id'),
  status: text('status').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
});

/**
 * Allocator monotónico del código de container por (scope, type). Un upsert
 * atómico (`INSERT … ON CONFLICT (scope_id, type) DO UPDATE SET
 * last_value = last_value + 1 RETURNING last_value`) reparte el siguiente valor,
 * de modo que dos altas concurrentes nunca acuñan el mismo código y un container
 * borrado nunca libera el suyo. La PK compuesta (scope_id, type) es la diana del
 * `ON CONFLICT` (definida en `wms_0003_containers.sql`).
 */
export const containerCodeSequencesTable = wms.table(
  'container_code_sequences',
  {
    scopeId: uuid('scope_id').notNull(),
    type: text('type').notNull(),
    lastValue: integer('last_value').notNull(),
  },
  (t) => [primaryKey({ columns: [t.scopeId, t.type] })],
);
