import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeEffectivePermissions } from './effective-permissions.ts';

const ROLES = [
  {
    id: 'integration_partner',
    permissions: ['need:read', 'offer:read', 'resource:read'],
  },
  { id: 'org_admin', permissions: ['apikey:create', 'role:grant', 'org:read'] },
  { id: 'viewer', permissions: ['org:read'] },
];

test('unions the permissions of every role granted at a scope', () => {
  const result = computeEffectivePermissions(
    [
      { roleId: 'integration_partner', scopeType: 'organization', scopeId: 'o1' },
      { roleId: 'viewer', scopeType: 'organization', scopeId: 'o1' },
    ],
    ROLES,
  );

  assert.equal(result.length, 1);
  assert.deepEqual(result[0], {
    scopeType: 'organization',
    scopeId: 'o1',
    permissions: ['need:read', 'offer:read', 'org:read', 'resource:read'],
  });
});

test('groups by distinct scope and orders broadest → narrowest', () => {
  const result = computeEffectivePermissions(
    [
      { roleId: 'integration_partner', scopeType: 'emergency', scopeId: 'e1' },
      { roleId: 'org_admin', scopeType: 'platform', scopeId: null },
    ],
    ROLES,
  );

  assert.deepEqual(
    result.map((r) => r.scopeType),
    ['platform', 'emergency'],
  );
});

test('a grant with an unknown role contributes nothing (fail-closed)', () => {
  const result = computeEffectivePermissions(
    [{ roleId: 'ghost_role', scopeType: 'organization', scopeId: 'o1' }],
    ROLES,
  );
  assert.deepEqual(result, []);
});

test('empty grants yield no effective permissions', () => {
  assert.deepEqual(computeEffectivePermissions([], ROLES), []);
});
