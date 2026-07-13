-- Tenencia del catálogo maestro escalable (#397, épica #228, Inc 2). Añade
-- `scope_id` (uuid, nullable) a `supplies` y `supply_aliases` — la columna ya
-- existe en `attribute_definitions` desde 0055. `scope_id IS NULL` = fila global
-- (base curada por admins globales); `scope_id = T` = extensión de un tenant.
-- Visible para T = global ∪ lo suyo; la fusión aditiva la resuelve el dominio
-- (`resolveEffectiveSchema`). La tenencia es un `scope_id` OPACO: el host lo mapea
-- a emergencia/organización; el modelo no fija qué es.
--
-- Unicidad por scope: cada unicidad global existente se convierte en un PAR de
-- índices únicos parciales — uno para globales (WHERE scope_id IS NULL, que
-- preserva el candado global anterior) y otro por tenant (WHERE scope_id IS NOT
-- NULL, que incluye scope_id en la clave). Así un tenant puede reutilizar un
-- code/alias/key que ya existe en global sin chocar, pero nunca duplicar dentro
-- de su propio scope. Fix-forward: se dropean los constraints/índices globales
-- previos y se recrean como el par (las migraciones aplicadas son inmutables).
-- Todo idempotente (IF EXISTS / IF NOT EXISTS) para BD ya migradas.

-- === attribute_definitions ===
-- 0055 dejó el índice global parcial `(category_slug,key) WHERE scope_id IS NULL`.
-- Aquí se añade sólo el contraparte de tenant (la columna ya existe).
CREATE UNIQUE INDEX IF NOT EXISTS "attribute_definitions_scope_category_key_uniq"
  ON "attribute_definitions" ("category_slug", "key", "scope_id")
  WHERE "scope_id" IS NOT NULL;
--> statement-breakpoint

-- === supplies ===
ALTER TABLE "supplies" ADD COLUMN IF NOT EXISTS "scope_id" uuid;
--> statement-breakpoint

-- La unicidad de `code` era global (índice `supplies_code_uniq` sobre (code),
-- creado en 0037). Se dropea y se recrea como par por scope.
DROP INDEX IF EXISTS "supplies_code_uniq";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "supplies_code_global_uniq"
  ON "supplies" ("code")
  WHERE "scope_id" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "supplies_code_scope_uniq"
  ON "supplies" ("code", "scope_id")
  WHERE "scope_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supplies_scope_id_idx" ON "supplies" ("scope_id");
--> statement-breakpoint

-- === supply_aliases ===
ALTER TABLE "supply_aliases" ADD COLUMN IF NOT EXISTS "scope_id" uuid;
--> statement-breakpoint

-- La unicidad del alias normalizado era la PRIMARY KEY sobre `alias_norm`
-- (creada en 0037). Un alias global y uno de tenant pueden compartir el mismo
-- texto (apuntando a supplies distintos), así que la PK global estorba: se
-- dropea y la unicidad pasa a ser el par de índices parciales por scope. La
-- tabla queda sin PK (nadie la referencia por FK), con `alias_norm` aún NOT NULL.
ALTER TABLE "supply_aliases" DROP CONSTRAINT IF EXISTS "supply_aliases_pkey";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "supply_aliases_alias_global_uniq"
  ON "supply_aliases" ("alias_norm")
  WHERE "scope_id" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "supply_aliases_alias_scope_uniq"
  ON "supply_aliases" ("alias_norm", "scope_id")
  WHERE "scope_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supply_aliases_scope_id_idx"
  ON "supply_aliases" ("scope_id");
