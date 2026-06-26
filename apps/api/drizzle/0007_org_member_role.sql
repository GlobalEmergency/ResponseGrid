-- Add role column to organization_members table
-- Existing rows get 'member' as default; creator-rows cannot be identified retroactively
-- so they are left as 'member'. New organizations created after this migration will
-- correctly receive 'owner' for the creator via the application layer.
ALTER TABLE "organization_members" ADD COLUMN IF NOT EXISTS "role" text NOT NULL DEFAULT 'member';
