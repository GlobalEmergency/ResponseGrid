-- Admin global users console (issue #176): the users table needs a registration
-- date and a last-login timestamp so the admin list can show when each account
-- was created and last used. Both columns are nullable / defaulted so existing
-- rows remain valid; `created_at` defaults to now() for new registrations and is
-- backfilled to now() for historical rows (their true creation time is unknown).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_at" timestamptz NOT NULL DEFAULT now();
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_at" timestamptz;
