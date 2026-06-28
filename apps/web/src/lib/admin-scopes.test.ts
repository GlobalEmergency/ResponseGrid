import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  administrableScopes,
  canAdminister,
  sortAdminScopes,
} from './admin-scopes.ts';

const ROLES = [
  { id: 'platform_admin', permissions: ['role:grant', 'apikey:create', 'user:invite', 'group:manage_members'] },
  { id: 'org_admin', permissions: ['user:invite', 'role:grant', 'apikey:create', 'group:manage_members', 'org:read'] },
  { id: 'org_member', permissions: ['org:read'] },
  { id: 'group_manager', permissions: ['group:manage_members', 'role:grant', 'user:invite'] },
  { id: 'viewer', permissions: ['org:read'] },
];

test('org_admin administers their organization with full caps', () => {
  const scopes = administrableScopes(
    [{ roleId: 'org_admin', scopeType: 'organization', scopeId: 'o1' }],
    ROLES,
  );
  assert.equal(scopes.length, 1);
  assert.equal(scopes[0].scopeType, 'organization');
  assert.equal(scopes[0].scopeId, 'o1');
  assert.equal(scopes[0].canGrantRoles, true);
  assert.equal(scopes[0].canManageKeys, true);
  assert.equal(scopes[0].canManageMembers, true);
});

test('a plain org_member administers nothing', () => {
  const grants = [{ roleId: 'org_member', scopeType: 'organization', scopeId: 'o1' }];
  assert.equal(administrableScopes(grants, ROLES).length, 0);
  assert.equal(canAdminister(grants, ROLES), false);
});

test('expired grants are ignored', () => {
  const scopes = administrableScopes(
    [
      {
        roleId: 'org_admin',
        scopeType: 'organization',
        scopeId: 'o1',
        expiresAt: '2000-01-01T00:00:00.000Z',
      },
    ],
    ROLES,
  );
  assert.equal(scopes.length, 0);
});

test('caps from multiple roles at the same scope are unioned and deduped', () => {
  const scopes = administrableScopes(
    [
      { roleId: 'group_manager', scopeType: 'group', scopeId: 'g1' },
      { roleId: 'group_manager', scopeType: 'group', scopeId: 'g1' },
    ],
    ROLES,
  );
  assert.equal(scopes.length, 1);
  assert.deepEqual(scopes[0].roleIds, ['group_manager']);
  assert.equal(scopes[0].canManageMembers, true);
  assert.equal(scopes[0].canManageKeys, false);
});

test('unknown roleId contributes nothing', () => {
  const scopes = administrableScopes(
    [{ roleId: 'wizard', scopeType: 'platform', scopeId: null }],
    ROLES,
  );
  assert.equal(scopes.length, 0);
});

test('sortAdminScopes orders platform → organization → group', () => {
  const scopes = administrableScopes(
    [
      { roleId: 'group_manager', scopeType: 'group', scopeId: 'g1' },
      { roleId: 'platform_admin', scopeType: 'platform', scopeId: null },
      { roleId: 'org_admin', scopeType: 'organization', scopeId: 'o1' },
    ],
    ROLES,
  );
  const sorted = sortAdminScopes(scopes).map((s) => s.scopeType);
  assert.deepEqual(sorted, ['platform', 'organization', 'group']);
});
