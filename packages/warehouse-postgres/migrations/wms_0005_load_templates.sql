-- wms_0005_load_templates — kits de misión (Inc 6 del EPIC de flota). La dotación
-- tipo de una misión/vehículo: un agregado `load_templates` con sus líneas en
-- `load_template_lines` (tabla, NO jsonb: se agregan por supply_id en el gap
-- analysis y en "¿qué kits usan este insumo?"). Namespaced en `wms.`. Idempotente.
--
-- Migración inmutable una vez fusionada: corregir hacia adelante con un nuevo
-- `wms_*.sql`, nunca editar este fichero.

CREATE TABLE IF NOT EXISTS wms.load_templates (
  id uuid PRIMARY KEY,
  scope_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS load_templates_scope_code_uq
  ON wms.load_templates (scope_id, code);

CREATE TABLE IF NOT EXISTS wms.load_template_lines (
  template_id uuid NOT NULL REFERENCES wms.load_templates (id) ON DELETE CASCADE,
  scope_id uuid NOT NULL,
  supply_id uuid NOT NULL,
  quantity numeric(18, 6) NOT NULL,
  unit text NOT NULL,
  permanent boolean NOT NULL DEFAULT false,
  notes text,
  PRIMARY KEY (template_id, supply_id)
);

CREATE INDEX IF NOT EXISTS load_template_lines_supply_idx
  ON wms.load_template_lines (scope_id, supply_id);
