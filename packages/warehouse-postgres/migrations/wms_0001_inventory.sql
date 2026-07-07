-- wms_0001_inventory — esquema de persistencia del módulo `inventory` de
-- warehouse-core. Vive en un esquema Postgres dedicado (`wms`) para que el
-- paquete pueda migrar de forma independiente del host que lo consuma.
--
-- Tenencia: la columna de partición es `scope_id` (uuid opaco), NUNCA
-- `emergency_id`: el paquete es agnóstico del sector (Protección Civil,
-- emergencia de ResponseGrid, etc.). El host mapea su propio id a `scope_id`.
--
-- Backbone de ubicaciones: warehouse → zone (entidad del agregado Warehouse) y
-- bin (agregado propio). El stock existente se modela con stock_items (grano
-- producto × lote × bin × estado, con `version` para concurrencia optimista) y
-- su libro mayor inmutable stock_movements (asiento de doble pata).
--
-- Migración inmutable una vez fusionada (convención del repo): corregir hacia
-- adelante con un nuevo `wms_*.sql`, nunca editar este fichero.

CREATE SCHEMA IF NOT EXISTS wms;

-- Almacén (agregado raíz). `code` único por scope.
CREATE TABLE IF NOT EXISTS wms.warehouses (
  id         uuid PRIMARY KEY,
  scope_id   uuid NOT NULL,
  code       text NOT NULL,
  name       text NOT NULL,
  address    text,
  lat        double precision,
  lng        double precision,
  status     text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT wms_warehouses_scope_code_uq UNIQUE (scope_id, code)
);

CREATE INDEX IF NOT EXISTS wms_warehouses_scope_idx ON wms.warehouses (scope_id);

-- Zona (entidad del agregado Warehouse). FK con borrado en cascada: una zona no
-- existe sin su almacén. `code` único por almacén.
CREATE TABLE IF NOT EXISTS wms.zones (
  id           uuid PRIMARY KEY,
  warehouse_id uuid NOT NULL REFERENCES wms.warehouses (id) ON DELETE CASCADE,
  code         text NOT NULL,
  name         text NOT NULL,
  kind         text NOT NULL,
  status       text NOT NULL,
  CONSTRAINT wms_zones_warehouse_code_uq UNIQUE (warehouse_id, code)
);

CREATE INDEX IF NOT EXISTS wms_zones_warehouse_idx ON wms.zones (warehouse_id);

-- Ubicación física (agregado propio). Referencia almacén y (opcionalmente) zona
-- por id. `scope_id` denormalizado para listados cross-warehouse. `code` único
-- por almacén.
CREATE TABLE IF NOT EXISTS wms.bins (
  id           uuid PRIMARY KEY,
  scope_id     uuid NOT NULL,
  warehouse_id uuid NOT NULL,
  zone_id      uuid,
  code         text NOT NULL,
  kind         text NOT NULL,
  status       text NOT NULL,
  created_at   timestamptz NOT NULL,
  updated_at   timestamptz NOT NULL,
  CONSTRAINT wms_bins_warehouse_code_uq UNIQUE (warehouse_id, code)
);

CREATE INDEX IF NOT EXISTS wms_bins_scope_idx ON wms.bins (scope_id);
CREATE INDEX IF NOT EXISTS wms_bins_warehouse_idx ON wms.bins (warehouse_id);

-- Unidad de existencia (agregado raíz). Grano producto × lote × bin × estado.
-- `quantity_amount` decimal (numeric(18,6), en sintonía con la escala 6 del VO
-- Quantity). `version` para concurrencia optimista.
CREATE TABLE IF NOT EXISTS wms.stock_items (
  id              uuid PRIMARY KEY,
  scope_id        uuid NOT NULL,
  warehouse_id    uuid NOT NULL,
  bin_id          uuid NOT NULL,
  supply_id       uuid NOT NULL,
  lot_code        text,
  expires_at      timestamptz,
  quantity_amount numeric(18, 6) NOT NULL,
  unit            text NOT NULL,
  status          text NOT NULL,
  version         integer NOT NULL,
  created_at      timestamptz NOT NULL,
  updated_at      timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS wms_stock_items_scope_idx ON wms.stock_items (scope_id);
CREATE INDEX IF NOT EXISTS wms_stock_items_bin_idx ON wms.stock_items (bin_id);
CREATE INDEX IF NOT EXISTS wms_stock_items_warehouse_idx ON wms.stock_items (warehouse_id);

-- Grano único (bin, supply, lote, estado). El lote nulo (stock no trazado por
-- lote) debe seguir siendo único, y un índice UNIQUE ordinario trata cada NULL
-- como distinto: se usa un par de índices parciales — uno para lote presente,
-- otro (con lot_code IS NULL) que garantiza una sola fila sin lote por
-- (bin, supply, estado).
CREATE UNIQUE INDEX IF NOT EXISTS wms_stock_items_grain_lot_uq
  ON wms.stock_items (bin_id, supply_id, lot_code, status)
  WHERE lot_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS wms_stock_items_grain_nolot_uq
  ON wms.stock_items (bin_id, supply_id, status)
  WHERE lot_code IS NULL;

-- Libro mayor (kardex). Append-only: sólo INSERT, nunca UPDATE/DELETE. Asiento
-- de doble pata (from/to, cada una StockItem o el exterior=null).
CREATE TABLE IF NOT EXISTS wms.stock_movements (
  id              uuid PRIMARY KEY,
  scope_id        uuid NOT NULL,
  kind            text NOT NULL,
  quantity_amount numeric(18, 6) NOT NULL,
  unit            text NOT NULL,
  from_item_id    uuid,
  to_item_id      uuid,
  reason          text,
  idempotency_key text,
  occurred_at     timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS wms_stock_movements_scope_idx ON wms.stock_movements (scope_id);
CREATE INDEX IF NOT EXISTS wms_stock_movements_from_idx ON wms.stock_movements (from_item_id);
CREATE INDEX IF NOT EXISTS wms_stock_movements_to_idx ON wms.stock_movements (to_item_id);

-- Idempotencia: clave única por scope cuando está presente (una entrada
-- reintentada con la misma clave se registra una sola vez). Índice parcial para
-- no restringir los movimientos sin clave.
CREATE UNIQUE INDEX IF NOT EXISTS wms_stock_movements_idempotency_uq
  ON wms.stock_movements (scope_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
