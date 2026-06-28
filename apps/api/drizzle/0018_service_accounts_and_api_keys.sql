-- 0018 — Machine principals: service accounts + API keys (docs/features/13 §8).
-- A service account is a principal (it receives grants via the grants table,
-- principal_type='service_account'); an API key is its credential. The key
-- secret is never stored — only its SHA-256 hash and a non-secret lookup prefix.

CREATE TABLE "service_accounts" (
  "id" uuid PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "owner_organization_id" uuid,
  "created_by_user_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "api_keys" (
  "id" uuid PRIMARY KEY NOT NULL,
  "prefix" text NOT NULL UNIQUE,
  "hashed_secret" text NOT NULL,
  "service_account_id" uuid NOT NULL REFERENCES "service_accounts"("id") ON DELETE CASCADE,
  "created_by_user_id" uuid NOT NULL,
  "expires_at" timestamptz,
  "last_used_at" timestamptz,
  "revoked_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "api_keys_service_account_idx" ON "api_keys" ("service_account_id");
