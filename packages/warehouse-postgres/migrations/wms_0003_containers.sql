-- wms_0003_containers — persistencia del agregado Container (palet/caja/lote) del
-- módulo `containers` de warehouse-core. Vive en el esquema dedicado `wms.` para
-- que el paquete migre independiente del host que lo consuma.
--
-- Tenencia: la columna de partición es `scope_id` (uuid opaco), NUNCA
-- `emergency_id`: el paquete es agnóstico del sector (Protección Civil,
-- emergencia de ResponseGrid, etc.). El host mapea su propio id a `scope_id`.
--
-- Composición por referencia: `parent_container_id` es una self-FK con ON DELETE
-- SET NULL (borrar un padre des-anida a sus hijos, no los borra). El holder es
-- polimórfico (resource|shipment) SIN FK, igual que el carrier de un shipment.
-- Las líneas de material van como jsonb (SupplyLineSnapshot[]), como en el host.
-- Peso/volumen brutos son `double precision` (declarados, aún no derivados).
--
-- El código secuencial por (scope, type) se asigna con un allocator atómico y
-- monotónico en `container_code_sequences` (INSERT … ON CONFLICT (scope_id, type)
-- DO UPDATE SET last_value = last_value + 1 RETURNING): dos altas concurrentes
-- nunca acuñan el mismo código y un container borrado nunca libera su código.
--
-- Migración inmutable una vez fusionada (convención del repo): corregir hacia
-- adelante con un nuevo `wms_*.sql`, nunca editar este fichero.

CREATE SCHEMA IF NOT EXISTS wms;
--> statement-breakpoint

-- Unidad de empaquetado rastreable (agregado raíz). `code` único por scope; el
-- árbol se compone por referencia (`parent_container_id`).
CREATE TABLE IF NOT EXISTS wms.containers (
  id                  uuid PRIMARY KEY,
  scope_id            uuid NOT NULL,
  code                text NOT NULL,
  type                text NOT NULL,
  parent_container_id uuid REFERENCES wms.containers (id) ON DELETE SET NULL,
  lines               jsonb NOT NULL DEFAULT '[]'::jsonb,
  gross_weight_kg     double precision,
  gross_volume_m3     double precision,
  holder_type         text,
  holder_id           uuid,
  status              text NOT NULL,
  created_at          timestamptz NOT NULL,
  updated_at          timestamptz NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS wms_containers_scope_idx ON wms.containers (scope_id);
--> statement-breakpoint

-- Código único por scope (lo que garantiza el allocator monotónico de abajo).
CREATE UNIQUE INDEX IF NOT EXISTS wms_containers_scope_code_uq
  ON wms.containers (scope_id, code);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS wms_containers_parent_idx
  ON wms.containers (parent_container_id);
--> statement-breakpoint

-- Allocator de código por (scope, type). `last_value` monotónico; la PK compuesta
-- (scope_id, type) es la diana del upsert atómico `ON CONFLICT`.
CREATE TABLE IF NOT EXISTS wms.container_code_sequences (
  scope_id   uuid NOT NULL,
  type       text NOT NULL,
  last_value integer NOT NULL,
  CONSTRAINT wms_container_code_sequences_pk PRIMARY KEY (scope_id, type)
);
