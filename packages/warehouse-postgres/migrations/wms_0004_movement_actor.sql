-- wms_0004_movement_actor — cadena de custodia del kardex (Inc 3 del EPIC de
-- flota). Añade a `wms.stock_movements` el autor del asiento (`actor_id`): un id
-- OPACO (el paquete no resuelve identidad ni permisos — eso lo hace el host,
-- #355). Nullable: los asientos históricos quedan sin autor.
--
-- Aditiva: el libro mayor sigue siendo inmutable (sólo INSERT); esto sólo suma
-- una columna que se rellena en el alta. Idempotente.
--
-- Migración inmutable una vez fusionada: corregir hacia adelante con un nuevo
-- `wms_*.sql`, nunca editar este fichero.

ALTER TABLE wms.stock_movements
  ADD COLUMN IF NOT EXISTS actor_id text;
