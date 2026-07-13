-- Naturaleza logística del insumo (#269): clasificación fina extensible en el
-- INSUMO (no en la categoría — una categoría puede mezclar naturalezas).
-- Nullable: null = sin clasificar; los ~574 insumos previos NO se rellenan.
-- Enum-via-CHECK, no un boolean, para poder crecer sin una migración destructiva.

ALTER TABLE "supplies" ADD COLUMN IF NOT EXISTS "nature" text;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'supplies_nature_check'
  ) THEN
    ALTER TABLE "supplies"
      ADD CONSTRAINT "supplies_nature_check"
      CHECK ("nature" IS NULL OR "nature" IN ('fungible', 'reusable', 'human'));
  END IF;
END $$;
