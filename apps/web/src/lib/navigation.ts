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
} from '@/lib/admin-scopes';

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
        { key: 'administracion', href: '/administracion', labelKey: 'administration' },
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
        href: '/notificaciones',
        labelKey: 'notifications',
        badgeCount: notificationUnread,
      },
      { key: 'groups', href: '/grupos', labelKey: 'my_groups' },
      { key: 'orgs', href: '/organizaciones', labelKey: 'my_orgs' },
      { key: 'permissions', href: '/mis-permisos', labelKey: 'my_permissions' },
    ],
  });

  return groups;
}
