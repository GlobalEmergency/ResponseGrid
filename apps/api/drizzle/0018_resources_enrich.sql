ALTER TABLE resources
  ADD COLUMN contact text,
  ADD COLUMN schedule text,
  ADD COLUMN manager text,
  ADD COLUMN accepts text[],
  ADD COLUMN source_name text,
  ADD COLUMN external_id text,
  ADD COLUMN external_updated_at timestamptz,
  ADD COLUMN country text,
  ADD COLUMN city text,
  ADD COLUMN raw jsonb;
CREATE UNIQUE INDEX resources_source_ext ON resources(source_name, external_id) WHERE source_name IS NOT NULL;
CREATE INDEX resources_emergency_country ON resources(emergency_id, country);
CREATE INDEX resources_accepts_gin ON resources USING gin(accepts);
ALTER TABLE resources ADD CONSTRAINT resources_source_ext_both_or_neither CHECK ((source_name IS NULL) = (external_id IS NULL));
