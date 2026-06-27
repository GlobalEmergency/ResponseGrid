-- Migration 0013: Reunification context — missing_person_reports + sightings
-- Bounded context F01: family reunification / missing persons

CREATE TABLE IF NOT EXISTS "missing_person_reports" (
  "id"                               UUID PRIMARY KEY,
  "emergency_id"                     UUID NOT NULL,

  -- Person being searched
  "person_first_name"                TEXT NOT NULL,
  "person_last_name"                 TEXT NOT NULL,
  "person_document_id"               TEXT,
  "person_approximate_age"           INTEGER,
  "person_last_known_location"       TEXT NOT NULL,
  "person_last_known_coords_address" TEXT,
  "person_last_known_coords_lat"     DOUBLE PRECISION,
  "person_last_known_coords_lon"     DOUBLE PRECISION,
  "person_description"               TEXT,

  -- Reporter contact
  "reporter_user_id"                 UUID,
  "reporter_name"                    TEXT NOT NULL,
  "reporter_phone"                   TEXT NOT NULL,
  "reporter_email"                   TEXT,

  -- Status & metadata
  "status"                           TEXT NOT NULL DEFAULT 'open',
  "consent_given"                    BOOLEAN NOT NULL DEFAULT FALSE,
  "photo_url"                        TEXT,
  "reviewed_by_user_id"              UUID,
  "match_note"                       TEXT,
  "created_at"                       TIMESTAMPTZ NOT NULL,
  "updated_at"                       TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_missing_person_reports_emergency_status"
  ON "missing_person_reports" ("emergency_id", "status");

CREATE INDEX IF NOT EXISTS "idx_missing_person_reports_document_id"
  ON "missing_person_reports" ("person_document_id");

CREATE TABLE IF NOT EXISTS "sightings" (
  "id"                   UUID PRIMARY KEY,
  "report_id"            UUID NOT NULL REFERENCES "missing_person_reports"("id") ON DELETE CASCADE,
  "reported_by_user_id"  UUID,
  "reported_by_name"     TEXT,
  "location"             TEXT NOT NULL,
  "coords_address"       TEXT,
  "coords_lat"           DOUBLE PRECISION,
  "coords_lon"           DOUBLE PRECISION,
  "note"                 TEXT NOT NULL,
  "reported_at"          TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_sightings_report_id"
  ON "sightings" ("report_id");
