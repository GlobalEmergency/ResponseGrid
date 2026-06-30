-- Category admin support (#221): allow soft-hiding categories without losing
-- the shared taxonomy, while keeping the existing public taxonomy seed intact.

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS categories_archived_at_idx
  ON categories (archived_at);
--> statement-breakpoint
