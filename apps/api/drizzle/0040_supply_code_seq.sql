-- Allocator de códigos INS-NNNN para insumos creados por el admin (#222). La
-- semilla 0037/0038 sembró hasta INS-0211 con códigos fijos; las altas vía la
-- API de gestión necesitan el siguiente código libre, único y monótono.
--
-- Se usa una SEQUENCE nativa (nextval) sembrada por encima del máximo actual.
-- Idempotente: CREATE SEQUENCE IF NOT EXISTS no re-crea; el setval reposiciona
-- la secuencia al máximo real cada vez que migrate.sh aplica el fichero (sólo
-- una vez en prod, rastreado por nombre). En el test global-setup la BD arranca
-- limpia con la semilla aplicada, así que MAX = 211 y el próximo nextval = 212.
CREATE SEQUENCE IF NOT EXISTS "supply_code_seq";
--> statement-breakpoint
SELECT setval(
  'supply_code_seq',
  GREATEST(
    (SELECT COALESCE(MAX(substring("code" FROM 5)::int), 0) FROM "supplies" WHERE "code" ~ '^INS-[0-9]+$'),
    1
  ),
  true
);
