import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emergencySectionItems, contextHref } from './navigation.ts';
import type { EmergencyAccess } from './emergency-permissions.ts';
import type { PrincipalContext } from './navigation.ts';

function access(partial: Partial<EmergencyAccess>): EmergencyAccess {
  return {
    roleIds: [],
    permissions: new Set<string>(),
    canValidateNeeds: false,
    canVerifyResources: false,
    canMatchOffers: false,
    canCoordinateLogistics: false,
    canCoordinate: false,
    canActOnAnyQueue: false,
    canViewAudit: false,
    canReadIntakes: false,
    canReceiveIntakes: false,
    ...partial,
  };
}

test('a verifier sees overview + resources + disputes only', () => {
  const items = emergencySectionItems('terremoto-venezuela-2026', access({ canVerifyResources: true }));
  assert.deepEqual(items.map((i) => i.key), ['overview', 'resources', 'disputes']);
  assert.equal(items[0].href, '/emergencies/terremoto-venezuela-2026/manage');
  assert.equal(items[0].exact, true);
  assert.equal(items[1].href, '/emergencies/terremoto-venezuela-2026/manage/resources');
  assert.equal(items[2].href, '/emergencies/terremoto-venezuela-2026/manage/resources/disputes');
});

test('a full coordinator sees every section in order', () => {
  const items = emergencySectionItems('e1', access({
    canVerifyResources: true, canValidateNeeds: true, canMatchOffers: true,
    canCoordinateLogistics: true, canCoordinate: true, canViewAudit: true,
  }));
  assert.deepEqual(items.map((i) => i.key), [
    'overview', 'resources', 'disputes', 'needs', 'offers', 'logistics', 'volunteers', 'reports', 'activity',
  ]);
});

test('no permissions → just the overview', () => {
  const items = emergencySectionItems('e1', access({}));
  assert.deepEqual(items.map((i) => i.key), ['overview']);
});

test('contextHref points each context type at its workspace', () => {
  const cases: [PrincipalContext, string][] = [
    [{ type: 'emergency', id: 'e1', slug: 'terremoto', name: 'T', roleIds: [] }, '/emergencies/terremoto/manage'],
    [{ type: 'point', id: 'p1', name: 'Almacén', roleIds: [] }, '/points/p1/manage'],
    [{ type: 'organization', id: 'o1', name: 'Cruz Roja', roleIds: [] }, '/organizations/o1/manage'],
    [{ type: 'group', id: 'g1', name: 'Logística B', roleIds: [] }, '/dashboard/groups/g1'],
  ];
  for (const [ctx, href] of cases) assert.equal(contextHref(ctx), href);
});
