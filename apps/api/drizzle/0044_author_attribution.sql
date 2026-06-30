-- Restricted "author" attribution on the citizen-grade writes (#235): when a
-- trusted integration creates a need / offer / resource on behalf of a third
-- party via a service-account API key, it attaches that person's self-reported
-- contact here. Stored as a single nullable JSONB blob (name/email/phone/note/
-- verified/source) — it is RESTRICTED and never queried/filtered, only surfaced
-- on coordinator/admin-gated reads. Legacy-safe: nullable, no backfill.

ALTER TABLE "needs"
  ADD COLUMN IF NOT EXISTS "author" jsonb;

ALTER TABLE "offers"
  ADD COLUMN IF NOT EXISTS "author" jsonb;

ALTER TABLE "resources"
  ADD COLUMN IF NOT EXISTS "author" jsonb;
