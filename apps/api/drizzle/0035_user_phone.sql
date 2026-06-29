-- Optional contact phone on the user profile (donation pre-registration #168):
-- so a logged-in donor's pre-registration reuses their registered contact, and
-- a profile created for an anonymous donor can carry the phone they provided.
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;
