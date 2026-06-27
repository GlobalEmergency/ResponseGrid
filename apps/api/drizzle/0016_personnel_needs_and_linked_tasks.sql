-- F05: Personnel needs ↔ volunteers
-- Adds optional personnel-need fields to needs table
-- and linked_need_id to tasks table (no FK to avoid cross-schema issues in test seeds)

ALTER TABLE needs
  ADD COLUMN required_skill  text,
  ADD COLUMN skill_specialty text,
  ADD COLUMN requested_count integer;

-- linked_need_id stored as plain uuid (no FK) to avoid cascade issues
-- when e2e tests seed fake needs and volunteers independently.
ALTER TABLE tasks
  ADD COLUMN linked_need_id uuid;
