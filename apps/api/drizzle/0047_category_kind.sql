-- Add "kind" to categories: distinguishes material aid (fungible/reusable) from
-- personnel. Minimal start (material|personnel); a richer item classification
-- (fungible/reusable/human) is deferred to issue #269. Enum-via-CHECK, not a
-- boolean, so it can grow without a destructive migration.

ALTER TABLE "categories"
  ADD COLUMN IF NOT EXISTS "kind" text NOT NULL DEFAULT 'material'
  CHECK ("kind" IN ('material', 'personnel'));

UPDATE "categories" SET "kind" = 'personnel' WHERE "slug" = 'medical_personnel';
