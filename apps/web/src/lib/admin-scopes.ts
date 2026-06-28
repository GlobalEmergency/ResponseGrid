/**
 * Derives, from a principal's effective grants and the role catalog, the set of
 * scopes they can ADMINISTER and what they can do in each. Pure and
 * framework-free so it works in Server and Client Components and is unit-tested.
 *
 * This is the heart of the role-aware admin hub: instead of special-casing each
 * role, we read the permissions each grant confers and group management
 * capabilities by scope (docs/features/13 §3, §5).
 */

/** Permissions that make a principal an administrator of a scope. */
export const MANAGEMENT_PERMISSIONS = [
  'role:grant',
  'user:invite',
  'apikey:create',
  'group:manage_members',
] as const;

export interface MeGrant {
  roleId: string;
  scopeType: string;
  scopeId: string | null;
  expiresAt?: string | null;
}

export interface RoleCatalogEntry {
  id: string;
  permissions: string[];
}

export interface AdminScope {
  /** Stable key `${scopeType}:${scopeId ?? ''}`. */
  key: string;
  scopeType: string;
  scopeId: string | null;
  /** Roles the principal holds at this scope that grant management power. */
  roleIds: string[];
  canGrantRoles: boolean;
  canInvite: boolean;
  canManageKeys: boolean;
  canManageMembers: boolean;
}

/** The scopes a principal can administer, with their capabilities, deduped. */
export function administrableScopes(
  grants: MeGrant[],
  roles: RoleCatalogEntry[],
  now: number = Date.now(),
): AdminScope[] {
  const permsByRole = new Map(
    roles.map((r) => [r.id, new Set(r.permissions)]),
  );
  const byScope = new Map<string, AdminScope>();

  for (const g of grants) {
    if (g.expiresAt && new Date(g.expiresAt).getTime() <= now) continue;
    const perms = permsByRole.get(g.roleId);
    if (!perms) continue;
    if (!MANAGEMENT_PERMISSIONS.some((p) => perms.has(p))) continue;

    const key = `${g.scopeType}:${g.scopeId ?? ''}`;
    const scope = byScope.get(key) ?? {
      key,
      scopeType: g.scopeType,
      scopeId: g.scopeId,
      roleIds: [],
      canGrantRoles: false,
      canInvite: false,
      canManageKeys: false,
      canManageMembers: false,
    };
    if (!scope.roleIds.includes(g.roleId)) scope.roleIds.push(g.roleId);
    scope.canGrantRoles = scope.canGrantRoles || perms.has('role:grant');
    scope.canInvite = scope.canInvite || perms.has('user:invite');
    scope.canManageKeys = scope.canManageKeys || perms.has('apikey:create');
    scope.canManageMembers =
      scope.canManageMembers || perms.has('group:manage_members');
    byScope.set(key, scope);
  }

  return [...byScope.values()];
}

/**
 * Role ids that confer management capability — a cheap signal for nav
 * visibility without loading the full role catalog. The hub itself does the
 * precise, catalog-driven check via {@link administrableScopes}.
 */
export const MANAGER_ROLE_IDS = [
  'platform_admin',
  'org_admin',
  'group_manager',
  'emergency_coordinator',
] as const;

/** Cheap check (no catalog) for whether to surface the admin entry in nav. */
export function hasManagerRole(grants: MeGrant[], now: number = Date.now()): boolean {
  const ids = MANAGER_ROLE_IDS as readonly string[];
  return grants.some((g) => {
    if (g.expiresAt && new Date(g.expiresAt).getTime() <= now) return false;
    return ids.includes(g.roleId);
  });
}

/** Whether a principal can administer at least one scope. */
export function canAdminister(
  grants: MeGrant[],
  roles: RoleCatalogEntry[],
  now: number = Date.now(),
): boolean {
  return administrableScopes(grants, roles, now).length > 0;
}

const SCOPE_ORDER: Record<string, number> = {
  platform: 0,
  organization: 1,
  emergency: 2,
  group: 3,
  entity: 4,
};

/** Stable display ordering: platform first, then org, emergency, group. */
export function sortAdminScopes(scopes: AdminScope[]): AdminScope[] {
  return [...scopes].sort(
    (a, b) => (SCOPE_ORDER[a.scopeType] ?? 9) - (SCOPE_ORDER[b.scopeType] ?? 9),
  );
}
