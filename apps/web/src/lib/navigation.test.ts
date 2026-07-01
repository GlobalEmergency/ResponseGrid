import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emergencySectionItems, contextHref, buildNavModel } from './navigation.ts';
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

const MARIA: PrincipalContext[] = [
  { type: 'emergency', id: 'e1', slug: 'terremoto', name: 'Terremoto Venezuela 2026', roleIds: ['emergency_verifier'] },
  { type: 'point', id: 'p1', name: 'Almacén Central Caracas', roleIds: ['point_manager'] },
  { type: 'organization', id: 'o1', name: 'Cruz Roja Local', roleIds: ['org_admin'] },
];

test('home model: categories, no active context, no admin', () => {
  const model = buildNavModel({
    contexts: MARIA, isAdmin: false, canAdminister: false, notificationUnread: 3,
  });
  const keys = model.map((g) => g.key);
  assert.deepEqual(keys, ['main', 'cat-emergencies', 'cat-points', 'cat-organizations', 'personal']);
  const emergencies = model.find((g) => g.key === 'cat-emergencies');
  assert.equal(emergencies?.items[0].href, '/emergencies/terremoto/manage');
});

test('empty categories are omitted', () => {
  const model = buildNavModel({
    contexts: [MARIA[2]], isAdmin: false, canAdminister: false, notificationUnread: 0,
  });
  assert.equal(model.some((g) => g.key === 'cat-emergencies'), false);
  assert.equal(model.some((g) => g.key === 'cat-organizations'), true);
});

test('active emergency inlines its gated sections under the context', () => {
  const verifier = access({ canVerifyResources: true });
  const model = buildNavModel({
    contexts: MARIA, isAdmin: false, canAdminister: false, notificationUnread: 3,
    activeContext: { type: 'emergency', id: 'e1' }, activeEmergencyAccess: verifier,
  });
  const emergencies = model.find((g) => g.key === 'cat-emergencies');
  const itemKeys = emergencies?.items.map((i) => i.key);
  assert.deepEqual(itemKeys, ['ctx-e1', 'sec-overview', 'sec-resources', 'sec-disputes']);
  const resources = emergencies?.items.find((i) => i.key === 'sec-resources');
  assert.equal(resources?.depth, 2);
});

test('admin group appears for platform admins', () => {
  const model = buildNavModel({
    contexts: [], isAdmin: true, canAdminister: true, notificationUnread: 0,
  });
  assert.equal(model.some((g) => g.key === 'admin'), true);
});
