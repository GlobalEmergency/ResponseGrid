-- Códigos externos estándar para interop (#398, épica #228): mapa abierto
-- namespace→código (jsonb) en insumos y categorías, mapeable/compatible con
-- estándares (UNSPSC, WHO EML, HXL, …) SIN acoplarse a ninguno. Por defecto '{}'.
-- Los ~574 insumos y las categorías previas quedan con el mapa vacío.

ALTER TABLE "supplies"
  ADD COLUMN IF NOT EXISTS "external_codes" jsonb NOT NULL DEFAULT '{}'::jsonb;
--> statement-breakpoint

ALTER TABLE "categories"
  ADD COLUMN IF NOT EXISTS "external_codes" jsonb NOT NULL DEFAULT '{}'::jsonb;
--> statement-breakpoint

-- GIN sobre supplies.external_codes: habilita la búsqueda inversa por código
-- externo (p.ej. `external_codes @> '{"unspsc":"51101500"}'` o `? 'unspsc'`)
-- sin escanear la tabla. jsonb_ops (por defecto) soporta tanto `@>` como `?`.
CREATE INDEX IF NOT EXISTS "supplies_external_codes_gin"
  ON "supplies" USING gin ("external_codes");
