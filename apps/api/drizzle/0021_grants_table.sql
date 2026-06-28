-- 0017 — Authorization grants table (docs/features/13 §12, slice 2).
-- Generalizes memberships + organization_members + users.is_admin into a single
-- polymorphic grant(principal, role, scope). Additive: the legacy tables are
-- kept and existing rows are backfilled, so nothing breaks during the
-- transition. No FK on principal_id / granted_by_principal_id because a
-- principal may be a service account, not only a user.

CREATE TABLE "grants" (
  "id" uuid PRIMARY KEY NOT NULL,
  "principal_id" uuid NOT NULL,
  "principal_type" text NOT NULL DEFAULT 'user',
  "role_id" text NOT NULL,
  "scope_type" text NOT NULL,
  "scope_id" text,
  "scope_entity_type" text,
  "granted_by_principal_id" uuid,
  "granted_at" timestamptz NOT NULL DEFAULT now(),
  "expires_at" timestamptz
);

CREATE INDEX "grants_principal_id_idx" ON "grants" ("principal_id");
CREATE INDEX "grants_scope_idx" ON "grants" ("scope_type", "scope_id");

-- Backfill 1: per-emergency memberships → emergency-scoped grants.
INSERT INTO "grants" (id, principal_id, principal_type, role_id, scope_type, scope_id)
SELECT m.id, m.user_id, 'user',
       CASE m.role
         WHEN 'coordinator' THEN 'emergency_coordinator'
         WHEN 'verifier' THEN 'emergency_verifier'
         ELSE m.role
       END,
       'emergency', m.emergency_id::text
FROM "memberships" m
ON CONFLICT (id) DO NOTHING;

-- Backfill 2: global admins (users.is_admin) → platform_admin grant.
INSERT INTO "grants" (id, principal_id, principal_type, role_id, scope_type, scope_id)
SELECT gen_random_uuid(), u.id, 'user', 'platform_admin', 'platform', NULL
FROM "users" u
WHERE u.is_admin = true;

-- Backfill 3: organization members → organization-scoped grants.
INSERT INTO "grants" (id, principal_id, principal_type, role_id, scope_type, scope_id)
SELECT gen_random_uuid(), om.user_id, 'user',
       CASE om.role WHEN 'owner' THEN 'org_admin' ELSE 'org_member' END,
       'organization', om.organization_id::text
FROM "organization_members" om;
