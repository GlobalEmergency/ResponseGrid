-- Optional freshness date per supply line, shared by inventory / needs /
-- donation intakes. Legacy-safe: nullable and backfilled as-is.

ALTER TABLE "resource_items"
  ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;

ALTER TABLE "need_items"
  ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;

ALTER TABLE "donation_intake_lines"
  ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;

ALTER TABLE "offer_items"
  ADD COLUMN IF NOT EXISTS "expires_at" timestamp with time zone;
