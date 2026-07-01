/**
 * Role-and-scope-aware navigation model.
 *
 * Pure, framework-free: given the principal's grants, the role catalog and a
 * little resolved context (emergencies they belong to, unread count), it returns
 * the menu structure. It does NOT fetch — the data layer (navigation-data.ts)
 * loads inputs and the app shell renders the output. Gating is by permission
 * (derived from /roles) and by scope, so new roles inherit menu items for free.
 *
 * Admin/management surfacing reuses the existing `admin-scopes` helper so the
 * sidebar stays consistent with the /administracion hub.
 */
import type { Messages } from '@/i18n/messages/es';
import {
  canAdminister,
  type MeGrant,
  type RoleCatalogEntry,
} from './admin-scopes.ts';
import type { EmergencyAccess } from '@/lib/emergency-permissions';

/** Static labels live in the `nav` i18n namespace; dynamic ones pass `label`. */
export type NavLabelKey = keyof Messages['nav'];

export interface NavItem {
  key: string;
  href: string;
  /** i18n key in the `nav` namespace (static items). */
  labelKey?: NavLabelKey;
  /** Pre-resolved label (dynamic items, e.g. an emergency name). */
  label?: string;
  badgeCount?: number;
  /** Active-match strategy: exact path vs path prefix (default: prefix). */
  exact?: boolean;
}

export interface NavGroup {
  key: string;
  headingKey?: NavLabelKey;
  items: NavItem[];
}

export type NavModel = NavGroup[];

/** An emergency the principal is granted into, resolved to a slug + roles. */
export interface MyEmergencyNav {
  id: string;
  slug: string;
  name: string;
  roleIds: string[];
}

export type ContextType = 'emergency' | 'point' | 'organization' | 'group';

/** A context the principal holds a grant in, resolved for the switcher. */
export interface PrincipalContext {
  type: ContextType;
  id: string;
  /** Emergencies address by slug; the rest by id. */
  slug?: string;
  name: string;
  roleIds: string[];
}

/** Which context (if any) the current route is inside. */
export interface ActiveContextRef {
  type: ContextType;
  id: string;
}

export function contextHref(c: PrincipalContext): string {
  switch (c.type) {
    case 'emergency':
      return `/emergencies/${c.slug}/manage`;
    case 'point':
      return `/points/${c.id}/manage`;
    case 'organization':
      return `/organizations/${c.id}/manage`;
    case 'group':
      return `/dashboard/groups/${c.id}`;
  }
}

/** Permissions that mean "this person operates this emergency" (coordinator/verifier). */
const COORDINATION_PERMISSIONS = [
  'need:validate',
  'need:prioritize',
  'offer:match',
  'report:triage',
  'task:assign',
  'task:create',
  'resource:verify',
];

export interface BuildNavArgs {
  grants: MeGrant[];
  roles: RoleCatalogEntry[];
  isAdmin: boolean;
  myEmergencies: MyEmergencyNav[];
  notificationUnread: number;
}

/** Max per-emergency coordination links shown directly in the sidebar. */
const MAX_COORDINATION_ITEMS = 8;

export function buildNavModel({
  grants,
  roles,
  isAdmin,
  myEmergencies,
  notificationUnread,
}: BuildNavArgs): NavModel {
  const permsByRole = new Map(roles.map((r) => [r.id, new Set(r.permissions)]));
  const groups: NavModel = [];

  // Top — Panel (always for authenticated users).
  groups.push({
    key: 'main',
    items: [{ key: 'panel', href: '/panel', labelKey: 'panel', exact: true }],
  });

  // Coordinación — one entry per emergency where the principal's roles confer
  // operational permissions (coordinator or verifier).
  const coordinationEmergencies = myEmergencies.filter((e) =>
    e.roleIds.some((roleId) => {
      const perms = permsByRole.get(roleId);
      return perms != null && COORDINATION_PERMISSIONS.some((p) => perms.has(p));
    }),
  );
  if (coordinationEmergencies.length > 0) {
    groups.push({
      key: 'coordination',
      headingKey: 'coordination',
      items: coordinationEmergencies.slice(0, MAX_COORDINATION_ITEMS).map((e) => ({
        key: `coord-${e.id}`,
        href: `/e/${e.slug}/coordinacion`,
        label: e.name,
      })),
    });
  }

  // Administración — single entry into the role-aware hub (reuses admin-scopes).
  if (isAdmin || canAdminister(grants, roles)) {
    groups.push({
      key: 'admin',
      items: [
        { key: 'administracion', href: '/panel/administracion', labelKey: 'administration' },
      ],
    });
  }

  // Personal — always available to any authenticated user.
  groups.push({
    key: 'personal',
    headingKey: 'account_section',
    items: [
      {
        key: 'notifications',
        href: '/panel/notificaciones',
        labelKey: 'notifications',
        badgeCount: notificationUnread,
      },
      { key: 'groups', href: '/panel/grupos', labelKey: 'my_groups' },
      { key: 'orgs', href: '/panel/organizaciones', labelKey: 'my_orgs' },
      { key: 'permissions', href: '/panel/mis-permisos', labelKey: 'my_permissions' },
    ],
  });

  return groups;
}

/**
 * Ordered nav items for an emergency's management sections, gated by the
 * principal's resolved access there. Mirrors the old coordination-tabs gating
 * (which this replaces) but emits the new English `/manage/...` routes.
 */
export function emergencySectionItems(
  slug: string,
  access: EmergencyAccess,
): NavItem[] {
  const base = `/emergencies/${slug}/manage`;
  const items: NavItem[] = [
    { key: 'overview', href: base, labelKey: 'sec_overview', exact: true },
  ];
  if (access.canVerifyResources) {
    items.push({ key: 'resources', href: `${base}/resources`, labelKey: 'sec_resources' });
    items.push({ key: 'disputes', href: `${base}/resources/disputes`, labelKey: 'sec_disputes' });
  }
  if (access.canValidateNeeds) {
    items.push({ key: 'needs', href: `${base}/needs`, labelKey: 'sec_needs' });
  }
  if (access.canMatchOffers) {
    items.push({ key: 'offers', href: `${base}/offers`, labelKey: 'sec_offers' });
  }
  if (access.canCoordinateLogistics) {
    items.push({ key: 'logistics', href: `${base}/logistics`, labelKey: 'sec_logistics' });
  }
  if (access.canCoordinate) {
    items.push({ key: 'volunteers', href: `${base}/volunteers`, labelKey: 'sec_volunteers' });
    items.push({ key: 'reports', href: `${base}/reports`, labelKey: 'sec_reports' });
  }
  if (access.canViewAudit) {
    items.push({ key: 'activity', href: `${base}/activity`, labelKey: 'sec_activity' });
  }
  return items;
}
