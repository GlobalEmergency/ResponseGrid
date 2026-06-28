import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveEmergencyAccess,
  canCoordinateAtPlatform,
} from './emergency-permissions.ts';

const ROLES = [
  {
    id: 'platform_admin',
    permissions: [
      'need:validate',
      'need:prioritize',
      'resource:verify',
      'offer:match',
      'audit:read',
      'role:grant',
    ],
  },
  {
    id: 'platform_operator',
    permissions: ['need:validate', 'resource:verify'],
  },
  {
    id: 'emergency_coordinator',
    permissions: ['need:validate', 'need:prioritize', 'offer:match', 'audit:read'],
  },
  { id: 'need_verifier', permissions: ['need:validate'] },
  // A platform-scoped role with no coordination power (read-only).
  { id: 'platform_viewer', permissions: ['org:read'] },
  // A citizen — only the implicit self perms, never coordination.
  { id: 'volunteer', permissions: ['task:read'] },
];

const E1 = '11111111-1111-4111-8111-111111111111';

test('resolveEmergencyAccess: platform grant applies to any emergency', () => {
  const access = resolveEmergencyAccess(
    E1,
    [{ roleId: 'platform_admin', scopeType: 'platform', scopeId: null }],
    ROLES,
  );
  assert.equal(access.canValidateNeeds, true);
  assert.equal(access.canVerifyResources, true);
  assert.equal(access.canActOnAnyQueue, true);
});

test('canCoordinateAtPlatform: platform_admin → true', () => {
  assert.equal(
    canCoordinateAtPlatform(
      [{ roleId: 'platform_admin', scopeType: 'platform', scopeId: null }],
      ROLES,
    ),
    true,
  );
});

test('canCoordinateAtPlatform: platform_operator (need:validate/resource:verify) → true', () => {
  assert.equal(
    canCoordinateAtPlatform(
      [{ roleId: 'platform_operator', scopeType: 'platform', scopeId: null }],
      ROLES,
    ),
    true,
  );
});

test('canCoordinateAtPlatform: a plain citizen → false', () => {
  assert.equal(
    canCoordinateAtPlatform(
      [{ roleId: 'volunteer', scopeType: 'platform', scopeId: null }],
      ROLES,
    ),
    false,
  );
});

test('canCoordinateAtPlatform: emergency-scoped coordinator → false (not platform-level)', () => {
  // They reach their own emergency via "Mis emergencias"; the overlay is for
  // platform principals only.
  assert.equal(
    canCoordinateAtPlatform(
      [{ roleId: 'emergency_coordinator', scopeType: 'emergency', scopeId: E1 }],
      ROLES,
    ),
    false,
  );
});

test('canCoordinateAtPlatform: a platform-scoped read-only role → false', () => {
  assert.equal(
    canCoordinateAtPlatform(
      [{ roleId: 'platform_viewer', scopeType: 'platform', scopeId: null }],
      ROLES,
    ),
    false,
  );
});

test('canCoordinateAtPlatform: expired platform grant is ignored', () => {
  assert.equal(
    canCoordinateAtPlatform(
      [
        {
          roleId: 'platform_admin',
          scopeType: 'platform',
          scopeId: null,
          expiresAt: '2000-01-01T00:00:00.000Z',
        },
      ],
      ROLES,
    ),
    false,
  );
});

test('canCoordinateAtPlatform: unknown roleId contributes nothing', () => {
  assert.equal(
    canCoordinateAtPlatform(
      [{ roleId: 'wizard', scopeType: 'platform', scopeId: null }],
      ROLES,
    ),
    false,
  );
});

test('canCoordinateAtPlatform: no grants → false', () => {
  assert.equal(canCoordinateAtPlatform([], ROLES), false);
});
