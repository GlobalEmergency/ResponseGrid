-- Umbral configurable de disputa por emergencia (#169).
-- Si es NULL, se usa el valor global (RESOURCE_DISPUTE_THRESHOLD env / 3).
ALTER TABLE emergencies
  ADD COLUMN IF NOT EXISTS resource_dispute_threshold integer;
--> statement-breakpoint
