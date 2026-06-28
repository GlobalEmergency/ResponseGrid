-- Migration 0027: republish the imported acopiove.org points and detach their
-- external provenance (it was a one-off initial import, now owned data).
--
-- Background (#B): the bulk import (scripts/ingest-acopiove.ts) inserts points
-- with public_status='active', but in production they ended up 'hidden' — only a
-- couple were visible on the public map/list while the metric still counted
-- ~574 as active. Step 1 restores the intended visibility; step 2 clears the
-- source/external id so they become plain manually-owned resources (no future
-- acopiove re-sync). The re-ingest UPDATE path preserves public_status, so a
-- direct UPDATE is the reliable remedy.
--
-- Idempotent: once source_name is cleared the rows no longer match, so a second
-- run is a no-op. Step 1 must run BEFORE step 2 (it filters on source_name).

-- 1. Republish points that ended up hidden.
UPDATE resources
SET public_status = 'active'
WHERE source_name = 'acopiove.org'
  AND public_status = 'hidden';

-- 2. Detach external provenance — treat them as owned/manual data.
UPDATE resources
SET source_name = NULL,
    external_id = NULL
WHERE source_name = 'acopiove.org';
