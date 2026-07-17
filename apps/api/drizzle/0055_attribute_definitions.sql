-- Metamodelo de atributos data-driven del catálogo maestro escalable (#396,
-- épica #228). "Una tabla que describe tablas": un admin define, en runtime y
-- sin desplegar, los campos tipados de cada familia de insumos. La familia es
-- un nodo de la taxonomía `categories` (con herencia por el árbol); un `Supply`
-- recibe la unión de las definiciones de toda su ascendencia de categoría, y su
-- `attributes` jsonb se valida contra ese esquema efectivo al escribir.
--
-- Enfoque A del diseño (JSONB + metamodelo): escala a miles de tipos sin
-- explosión de tablas y reutiliza el `attributes` actual. `scope_id` queda
-- nullable (null = global) para que la tenencia (Inc 2) lo use sin migrar de
-- nuevo; en Inc 1 siempre es NULL.

CREATE TABLE IF NOT EXISTS "attribute_definitions" (
  "id" uuid PRIMARY KEY,
  "category_slug" text NOT NULL REFERENCES "categories"("slug"),
  "key" text NOT NULL,
  "data_type" text NOT NULL
    CHECK ("data_type" IN ('text', 'number', 'integer', 'boolean', 'enum', 'date', 'quantity')),
  "required" boolean NOT NULL DEFAULT false,
  "options" jsonb,
  "unit" text,
  "sort" integer NOT NULL DEFAULT 0,
  "scope_id" uuid,
  "archived_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

-- Unicidad de la definición global por (categoría, key). El índice parcial sobre
-- scope_id IS NULL deja libre el mismo par para las definiciones de tenant (Inc
-- 2), que unicidad-an aparte por scope.
CREATE UNIQUE INDEX IF NOT EXISTS "attribute_definitions_global_category_key_uniq"
  ON "attribute_definitions" ("category_slug", "key")
  WHERE "scope_id" IS NULL;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "attribute_definitions_category_slug_idx"
  ON "attribute_definitions" ("category_slug");
--> statement-breakpoint

-- Faceteo por los atributos ricos del catálogo (enfoque A): índice GIN sobre el
-- jsonb de `supplies.attributes` para consultas por contenido/clave sin joins.
CREATE INDEX IF NOT EXISTS "supplies_attributes_gin_idx"
  ON "supplies" USING gin ("attributes");
