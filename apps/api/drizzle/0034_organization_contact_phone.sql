-- Organizations gain a contact phone alongside the existing contact email
-- (creation form treats it as an essential contact field). Nullable so existing
-- rows (and programmatic/admin creation) remain valid; the end-user creation
-- forms enforce its presence at the UI layer.
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "contact_phone" text;
