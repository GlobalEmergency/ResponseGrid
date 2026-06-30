-- Soft link from each supply line to the canonical supplies master data.
-- Nullable and legacy-safe: existing rows can stay unlinked.

ALTER TABLE "need_items"
  ADD COLUMN IF NOT EXISTS "supply_id" uuid REFERENCES "supplies"("id") ON DELETE SET NULL;

ALTER TABLE "offer_items"
  ADD COLUMN IF NOT EXISTS "supply_id" uuid REFERENCES "supplies"("id") ON DELETE SET NULL;

ALTER TABLE "resource_items"
  ADD COLUMN IF NOT EXISTS "supply_id" uuid REFERENCES "supplies"("id") ON DELETE SET NULL;

ALTER TABLE "donation_intake_lines"
  ADD COLUMN IF NOT EXISTS "supply_id" uuid REFERENCES "supplies"("id") ON DELETE SET NULL;
