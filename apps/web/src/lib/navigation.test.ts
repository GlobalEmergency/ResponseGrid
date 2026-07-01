import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  emergencySectionItems,
  contextHref,
  buildNavModel,
  buildPrincipalContexts,
  adminSectionItems,
} from './navigation.ts';
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
    [{ type: 'resource', id: 'p1', name: 'Almacén', roleIds: [] }, '/resources/p1/manage'],
    [{ type: 'organization', id: 'o1', name: 'Cruz Roja', roleIds: [] }, '/organizations/o1/manage'],
    [{ type: 'group', id: 'g1', name: 'Logística B', roleIds: [] }, '/dashboard/groups/g1'],
  ];
  for (const [ctx, href] of cases) assert.equal(contextHref(ctx), href);
});

const MARIA: PrincipalContext[] = [
  { type: 'emergency', id: 'e1', slug: 'terremoto', name: 'Terremoto Venezuela 2026', roleIds: ['emergency_verifier'] },
  { type: 'resource', id: 'p1', name: 'Almacén Central Caracas', roleIds: ['point_manager'], resourceType: 'warehouse' },
  { type: 'organization', id: 'o1', name: 'Cruz Roja Local', roleIds: ['org_admin'] },
];

test('home model: categories, no active context, no admin', () => {
  const model = buildNavModel({
    contexts: MARIA, isAdmin: false, canAdminister: false, notificationUnread: 3,
  });
  const keys = model.map((g) => g.key);
  assert.deepEqual(keys, ['main', 'cat-emergencies', 'cat-resources', 'cat-organizations', 'personal']);
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

test('active emergency nests its gated sections as children of the context', () => {
  const verifier = access({ canVerifyResources: true });
  const model = buildNavModel({
    contexts: MARIA, isAdmin: false, canAdminister: false, notificationUnread: 3,
    activeContext: { type: 'emergency', id: 'e1' }, activeEmergencyAccess: verifier,
  });
  const emergencies = model.find((g) => g.key === 'cat-emergencies');
  const ctx = emergencies?.items.find((i) => i.key === 'ctx-e1');
  assert.deepEqual(ctx?.children?.map((i) => i.key), ['sec-overview', 'sec-resources', 'sec-disputes']);
});

test('a context with no active state has no children', () => {
  const model = buildNavModel({
    contexts: MARIA, isAdmin: false, canAdminister: false, notificationUnread: 0,
  });
  const emergencies = model.find((g) => g.key === 'cat-emergencies');
  const ctx = emergencies?.items.find((i) => i.key === 'ctx-e1');
  assert.equal(ctx?.children, undefined);
});

test('admin group appears for platform admins', () => {
  const model = buildNavModel({
    contexts: [], isAdmin: true, canAdminister: true, notificationUnread: 0,
  });
  assert.equal(model.some((g) => g.key === 'admin'), true);
});

test('buildPrincipalContexts maps each source to a typed context', () => {
  const ctx = buildPrincipalContexts({
    emergencies: [{ id: 'e1', slug: 'terremoto', name: 'Terremoto', roleIds: ['emergency_verifier'] }],
    resources: [{ id: 'p1', name: 'Almacén', resourceType: 'warehouse' }],
    organizations: [{ id: 'o1', name: 'Cruz Roja' }],
    groups: [{ id: 'g1', name: 'Logística B' }],
  });
  assert.deepEqual(ctx.map((c) => [c.type, c.id]), [
    ['emergency', 'e1'], ['resource', 'p1'], ['organization', 'o1'], ['group', 'g1'],
  ]);
  const emergency = ctx.find((c) => c.type === 'emergency');
  assert.equal(emergency?.slug, 'terremoto');
  assert.deepEqual(emergency?.roleIds, ['emergency_verifier']);
  const resource = ctx.find((c) => c.type === 'resource');
  assert.equal(resource?.slug, undefined);
  assert.deepEqual(resource?.roleIds, []);
  assert.equal(resource?.resourceType, 'warehouse');
});

test('empty sources produce an empty context list', () => {
  assert.deepEqual(
    buildPrincipalContexts({ emergencies: [], resources: [], organizations: [], groups: [] }),
    [],
  );
});

test('adminSectionItems lists the 9 admin sections with /admin routes', () => {
  const items = adminSectionItems();
  assert.deepEqual(items.map((i) => i.href), [
    '/admin', '/admin/users', '/admin/organizations', '/admin/points',
    '/admin/permissions', '/admin/api-keys', '/admin/accreditations',
    '/admin/templates', '/admin/audit',
  ]);
  assert.equal(items[0].exact, true);
});

test('platform admin sees admin sections nested; active admin expands them', () => {
  const model = buildNavModel({
    contexts: [], isAdmin: true, canAdminister: true, notificationUnread: 0,
    activeContext: { type: 'admin', id: 'platform' },
  });
  const admin = model.find((g) => g.key === 'admin');
  const hub = admin?.items.find((i) => i.key === 'admin');
  assert.equal(hub?.children?.[1]?.href, '/admin/users');
});

test('scope-only admin (not platform) gets a single admin link, no children', () => {
  const model = buildNavModel({
    contexts: [], isAdmin: false, canAdminister: true, notificationUnread: 0,
  });
  const admin = model.find((g) => g.key === 'admin');
  const hub = admin?.items.find((i) => i.key === 'admin');
  assert.equal(hub?.children, undefined);
});
