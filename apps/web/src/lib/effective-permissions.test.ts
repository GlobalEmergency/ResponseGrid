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
  { id: 'empty_role', permissions: [] },
];

const NOW = new Date('2026-07-06T00:00:00Z');

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

test('an expired grant confers nothing (matches the server PDP)', () => {
  const result = computeEffectivePermissions(
    [
      {
        roleId: 'integration_partner',
        scopeType: 'organization',
        scopeId: 'o1',
        expiresAt: '2026-07-05T00:00:00Z', // before NOW
      },
    ],
    ROLES,
    NOW,
  );
  assert.deepEqual(result, []);
});

test('a not-yet-expired grant still counts', () => {
  const result = computeEffectivePermissions(
    [
      {
        roleId: 'viewer',
        scopeType: 'organization',
        scopeId: 'o1',
        expiresAt: '2026-07-10T00:00:00Z', // after NOW
      },
    ],
    ROLES,
    NOW,
  );
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].permissions, ['org:read']);
});

test('a role with an empty permission set yields no dangling scope row', () => {
  const result = computeEffectivePermissions(
    [{ roleId: 'empty_role', scopeType: 'organization', scopeId: 'o1' }],
    ROLES,
    NOW,
  );
  assert.deepEqual(result, []);
});
