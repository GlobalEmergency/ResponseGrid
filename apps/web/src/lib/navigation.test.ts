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
    [{ type: 'resource', id: 'p1', name: 'Almacén', roleIds: [], emergencySlug: 'terremoto' }, '/e/terremoto/mis-puntos/p1/inventario'],
    [{ type: 'resource', id: 'p2', name: 'Sin slug', roleIds: [], emergencySlug: null }, '/dashboard'],
    [{ type: 'organization', id: 'o1', name: 'Cruz Roja', roleIds: [] }, '/organizations/o1/manage'],
    [{ type: 'group', id: 'g1', name: 'Logística B', roleIds: [] }, '/dashboard/groups/g1'],
  ];
  for (const [ctx, href] of cases) assert.equal(contextHref(ctx), href);
});

const MARIA: PrincipalContext[] = [
  { type: 'emergency', id: 'e1', slug: 'terremoto', name: 'Terremoto Venezuela 2026', roleIds: ['emergency_verifier'] },
  { type: 'resource', id: 'p1', name: 'Almacén Central Caracas', roleIds: ['point_manager'], resourceType: 'warehouse', emergencySlug: 'terremoto' },
  { type: 'organization', id: 'o1', name: 'Cruz Roja Local', roleIds: ['org_admin'] },
];

test('home model: categories, no active context, no admin', () => {
  const model = buildNavModel({
    contexts: MARIA, isAdmin: false, canAdminister: false, notificationUnread: 3,
    emergencyAccessById: {},
  });
  const keys = model.map((g) => g.key);
  assert.deepEqual(keys, ['main', 'cat-emergencies', 'cat-resources', 'cat-organizations', 'personal']);
  const emergencies = model.find((g) => g.key === 'cat-emergencies');
  assert.equal(emergencies?.items[0].href, '/emergencies/terremoto/manage');
});

test('empty categories are omitted', () => {
  const model = buildNavModel({
    contexts: [MARIA[2]], isAdmin: false, canAdminister: false, notificationUnread: 0,
    emergencyAccessById: {},
  });
  assert.equal(model.some((g) => g.key === 'cat-emergencies'), false);
  assert.equal(model.some((g) => g.key === 'cat-organizations'), true);
});

test('every emergency context nests its own gated sections as children', () => {
  const verifier = access({ canVerifyResources: true });
  const model = buildNavModel({
    contexts: MARIA, isAdmin: false, canAdminister: false, notificationUnread: 3,
    emergencyAccessById: { e1: verifier },
  });
  const emergencies = model.find((g) => g.key === 'cat-emergencies');
  const ctx = emergencies?.items.find((i) => i.key === 'ctx-e1');
  assert.deepEqual(ctx?.children?.map((i) => i.key), ['sec-overview', 'sec-resources', 'sec-disputes']);
});

test('sections are gated by EACH emergency access (a different map → different sections)', () => {
  const coordinator = access({
    canVerifyResources: true, canValidateNeeds: true, canMatchOffers: true,
    canCoordinateLogistics: true, canCoordinate: true, canViewAudit: true,
  });
  const contexts: PrincipalContext[] = [
    MARIA[0],
    { type: 'emergency', id: 'e2', slug: 'otra', name: 'Otra Emergencia', roleIds: ['emergency_coordinator'] },
  ];
  const model = buildNavModel({
    contexts, isAdmin: false, canAdminister: false, notificationUnread: 0,
    emergencyAccessById: { e1: access({ canVerifyResources: true }), e2: coordinator },
  });
  const emergencies = model.find((g) => g.key === 'cat-emergencies');
  const e1 = emergencies?.items.find((i) => i.key === 'ctx-e1');
  const e2 = emergencies?.items.find((i) => i.key === 'ctx-e2');
  assert.deepEqual(e1?.children?.map((i) => i.key), ['sec-overview', 'sec-resources', 'sec-disputes']);
  assert.deepEqual(e2?.children?.map((i) => i.key), [
    'sec-overview', 'sec-resources', 'sec-disputes', 'sec-needs', 'sec-offers',
    'sec-logistics', 'sec-volunteers', 'sec-reports', 'sec-activity',
  ]);
});

test('an emergency context with no access entry has no children', () => {
  const model = buildNavModel({
    contexts: MARIA, isAdmin: false, canAdminister: false, notificationUnread: 0,
    emergencyAccessById: {},
  });
  const emergencies = model.find((g) => g.key === 'cat-emergencies');
  const ctx = emergencies?.items.find((i) => i.key === 'ctx-e1');
  assert.equal(ctx?.children, undefined);
});

test('admin group appears for platform admins', () => {
  const model = buildNavModel({
    contexts: [], isAdmin: true, canAdminister: true, notificationUnread: 0,
    emergencyAccessById: {},
  });
  assert.equal(model.some((g) => g.key === 'admin'), true);
});

test('buildPrincipalContexts maps each source to a typed context', () => {
  const ctx = buildPrincipalContexts({
    emergencies: [{ id: 'e1', slug: 'terremoto', name: 'Terremoto', roleIds: ['emergency_verifier'] }],
    resources: [{ id: 'p1', name: 'Almacén', resourceType: 'warehouse', emergencySlug: 'terremoto' }],
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
  assert.equal(resource?.emergencySlug, 'terremoto');
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

test('platform admin always gets the admin sections nested (not gated on active)', () => {
  const model = buildNavModel({
    contexts: [], isAdmin: true, canAdminister: true, notificationUnread: 0,
    emergencyAccessById: {},
  });
  const admin = model.find((g) => g.key === 'admin');
  const hub = admin?.items.find((i) => i.key === 'admin');
  assert.equal(hub?.children?.[1]?.href, '/admin/users');
});

test('scope-only admin (not platform) gets a single admin link, no children', () => {
  const model = buildNavModel({
    contexts: [], isAdmin: false, canAdminister: true, notificationUnread: 0,
    emergencyAccessById: {},
  });
  const admin = model.find((g) => g.key === 'admin');
  const hub = admin?.items.find((i) => i.key === 'admin');
  assert.equal(hub?.children, undefined);
});
