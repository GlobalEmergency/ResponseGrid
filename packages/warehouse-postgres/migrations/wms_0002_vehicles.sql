-- wms_0002_vehicles — el vehículo como almacén móvil (Inc 2 del EPIC de flota).
-- Añade a `wms.warehouses` la naturaleza física (`kind`) y la carga útil máxima
-- (payload) en peso y/o volumen. Aditiva e idempotente: los almacenes existentes
-- quedan `kind = 'fixed'` con capacidad nula.
--
-- La invariante "un vehículo puede tener capacidad parcial pero al menos una
-- dimensión, y sólo un vehículo la declara" se valida en el DOMINIO (VO Capacity
-- + Warehouse). Aquí sólo se restringe el dominio de valores de `kind`.
--
-- Migración inmutable una vez fusionada: corregir hacia adelante con un nuevo
-- `wms_*.sql`, nunca editar este fichero.

ALTER TABLE wms.warehouses
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'fixed';
--> statement-breakpoint

ALTER TABLE wms.warehouses
  ADD COLUMN IF NOT EXISTS max_weight_kg numeric(18, 6);
--> statement-breakpoint

ALTER TABLE wms.warehouses
  ADD COLUMN IF NOT EXISTS max_volume_m3 numeric(18, 6);
--> statement-breakpoint

-- CHECK del dominio de `kind`. Postgres no soporta `ADD CONSTRAINT IF NOT EXISTS`,
-- así que se guarda con un bloque idempotente sobre `pg_constraint`.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'wms_warehouses_kind_chk'
      AND conrelid = 'wms.warehouses'::regclass
  ) THEN
    ALTER TABLE wms.warehouses
      ADD CONSTRAINT wms_warehouses_kind_chk CHECK (kind IN ('fixed', 'vehicle'));
  END IF;
END $$;
