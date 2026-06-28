-- One-time bootstrap grants for the two test accounts.
-- Idempotent (guarded by NOT EXISTS). Applied via .github/workflows/bootstrap-grant.yml
-- (OIDC -> SSM), the same authorized channel the deploy uses. Safe to re-run.

-- admin@responsegrid.app -> platform_admin (global). Also set the legacy is_admin
-- flag for compatibility with any code path that still reads it.
INSERT INTO grants (id, principal_id, principal_type, role_id, scope_type, scope_id, granted_at)
SELECT gen_random_uuid(), u.id, 'user', 'platform_admin', 'platform', NULL, now()
FROM users u
WHERE u.email = 'admin@responsegrid.app'
  AND NOT EXISTS (
    SELECT 1 FROM grants g
    WHERE g.principal_id = u.id AND g.role_id = 'platform_admin' AND g.scope_type = 'platform'
  );

UPDATE users SET is_admin = true WHERE email = 'admin@responsegrid.app';

-- validator@responsegrid.app -> emergency_verifier scoped to the Venezuela emergency.
INSERT INTO grants (id, principal_id, principal_type, role_id, scope_type, scope_id, granted_at)
SELECT gen_random_uuid(), u.id, 'user', 'emergency_verifier', 'emergency',
       '11111111-1111-4111-8111-111111111111', now()
FROM users u
WHERE u.email = 'validator@responsegrid.app'
  AND NOT EXISTS (
    SELECT 1 FROM grants g
    WHERE g.principal_id = u.id AND g.role_id = 'emergency_verifier'
      AND g.scope_type = 'emergency'
      AND g.scope_id = '11111111-1111-4111-8111-111111111111'
  );

-- Verification (printed to the workflow log).
SELECT u.email, u.is_admin, g.role_id, g.scope_type, g.scope_id
FROM users u
LEFT JOIN grants g ON g.principal_id = u.id
WHERE u.email IN ('admin@responsegrid.app', 'validator@responsegrid.app')
ORDER BY u.email, g.role_id;
