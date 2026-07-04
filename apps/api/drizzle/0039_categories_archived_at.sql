-- #221: soft-archive de categorías del catálogo. Permite ocultar una categoría
-- sin perder la taxonomía compartida ni romper los ~12 slugs núcleo (enum
-- Category), referenciados por el código y por otras tablas. Campo INTERNO: el
-- GET /categories público filtra por archived_at IS NULL y no lo proyecta.

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS categories_archived_at_idx
  ON categories (archived_at);
--> statement-breakpoint
