-- F03: Structural damage and trapped persons (SAR)
-- Adds columns for structural detail, published status, and extended status values.

ALTER TABLE "reports"
  ADD COLUMN IF NOT EXISTS "damage_level"              text,
  ADD COLUMN IF NOT EXISTS "trapped_persons_estimate"  integer,
  ADD COLUMN IF NOT EXISTS "accessible_for_rescue"     boolean,
  ADD COLUMN IF NOT EXISTS "building_type"             text,
  ADD COLUMN IF NOT EXISTS "published_at"              timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "publish_note"              text;

-- Index to efficiently query the public damage layer (published structural reports per emergency)
CREATE INDEX IF NOT EXISTS reports_emergency_id_status_type_idx
  ON "reports" ("emergency_id", "status", "type");
