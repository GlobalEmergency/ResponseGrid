-- Catálogo maestro de insumos (#216/#217/#218): base global de supplies,
-- alias normalizados y traducciones/i18n para categorías e insumos.
-- Mantiene `categories` como jerarquía global ya existente (parent_slug) y
-- añade tablas aparte para el contenido traducible.

CREATE TABLE IF NOT EXISTS "supplies" (
  "id" uuid PRIMARY KEY NOT NULL,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "category_slug" text NOT NULL REFERENCES "categories"("slug"),
  "default_unit" text,
  "attributes" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "variant_of_id" uuid REFERENCES "supplies"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "supplies_code_uniq" ON "supplies" ("code");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supplies_category_slug_idx" ON "supplies" ("category_slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supplies_variant_of_id_idx" ON "supplies" ("variant_of_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "supply_aliases" (
  "alias_norm" text PRIMARY KEY NOT NULL,
  "supply_id" uuid NOT NULL REFERENCES "supplies"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supply_aliases_supply_id_idx" ON "supply_aliases" ("supply_id");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "category_translations" (
  "category_slug" text NOT NULL REFERENCES "categories"("slug") ON DELETE CASCADE,
  "locale" text NOT NULL,
  "label" text NOT NULL,
  PRIMARY KEY ("category_slug", "locale")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "category_translations_locale_idx" ON "category_translations" ("locale");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "supply_translations" (
  "supply_id" uuid NOT NULL REFERENCES "supplies"("id") ON DELETE CASCADE,
  "locale" text NOT NULL,
  "name" text NOT NULL,
  PRIMARY KEY ("supply_id", "locale")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supply_translations_locale_idx" ON "supply_translations" ("locale");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "categories_parent_slug_idx" ON "categories" ("parent_slug");
