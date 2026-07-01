ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS dispute_dismissed_at timestamptz;
--> statement-breakpoint
