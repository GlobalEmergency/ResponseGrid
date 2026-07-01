/**
 * Context-aware navigation model.
 *
 * Pure, framework-free: given the principal's resolved contexts (emergencies,
 * points, organizations, groups they hold a grant in), the active context (if
 * any) and its resolved access, it returns the menu structure — Inicio, one
 * collapsible category per context type, the active context's gated sections
 * inlined, personal links and, if applicable, the administration hub. It does
 * NOT fetch — the data layer (navigation-data.ts) loads inputs and the app
 * shell renders the output. `isAdmin`/`canAdminister` are passed in so this
 * module has no dependency on `admin-scopes`.
 */
import type { Messages } from '@/i18n/messages/es';
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
  /** Nesting level for indentation (0 = top-level). */
  depth?: number;
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

const CATEGORY_ORDER: { type: ContextType; key: string; headingKey: NavLabelKey }[] = [
  { type: 'emergency', key: 'cat-emergencies', headingKey: 'cat_emergencies' },
  { type: 'point', key: 'cat-points', headingKey: 'cat_points' },
  { type: 'organization', key: 'cat-organizations', headingKey: 'cat_organizations' },
  { type: 'group', key: 'cat-groups', headingKey: 'cat_groups' },
];

export interface BuildNavArgs {
  contexts: PrincipalContext[];
  isAdmin: boolean;
  canAdminister: boolean;
  notificationUnread: number;
  activeContext?: ActiveContextRef;
  activeEmergencyAccess?: EmergencyAccess;
}

export function buildNavModel({
  contexts,
  isAdmin,
  canAdminister,
  notificationUnread,
  activeContext,
  activeEmergencyAccess,
}: BuildNavArgs): NavModel {
  const groups: NavModel = [];

  // Top — Inicio (personal home).
  groups.push({
    key: 'main',
    items: [{ key: 'home', href: '/dashboard', labelKey: 'home', exact: true }],
  });

  // One collapsible category per context type the principal actually has.
  for (const cat of CATEGORY_ORDER) {
    const inCat = contexts.filter((c) => c.type === cat.type);
    if (inCat.length === 0) continue;

    const items: NavItem[] = [];
    for (const c of inCat) {
      items.push({ key: `ctx-${c.id}`, href: contextHref(c), label: c.name, depth: 1 });
      const isActive =
        activeContext != null && activeContext.type === c.type && activeContext.id === c.id;
      if (isActive && c.type === 'emergency' && activeEmergencyAccess != null && c.slug != null) {
        for (const s of emergencySectionItems(c.slug, activeEmergencyAccess)) {
          items.push({ ...s, key: `sec-${s.key}`, depth: 2 });
        }
      }
    }
    groups.push({ key: cat.key, headingKey: cat.headingKey, items });
  }

  // Personal — always.
  groups.push({
    key: 'personal',
    headingKey: 'account_section',
    items: [
      { key: 'notifications', href: '/dashboard/notifications', labelKey: 'notifications', badgeCount: notificationUnread },
      { key: 'donations', href: '/dashboard/donations', labelKey: 'my_donations' },
      { key: 'permissions', href: '/dashboard/permissions', labelKey: 'my_permissions' },
      { key: 'profile', href: '/dashboard/profile', labelKey: 'my_profile' },
    ],
  });

  // Administración — platform-level hub.
  if (isAdmin || canAdminister) {
    groups.push({
      key: 'admin',
      items: [{ key: 'admin', href: '/admin', labelKey: 'administration' }],
    });
  }

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
