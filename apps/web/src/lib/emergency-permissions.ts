/**
 * Derives, for a single emergency, the effective permissions and roles a
 * principal holds there — from their `/auth/me` grants and the `/roles`
 * catalog. Pure and framework-free (mirrors the permission resolution in
 * `navigation.ts` / `admin-scopes.ts`) so it runs in Server and Client
 * Components and is unit-testable.
 *
 * A grant confers a permission at an emergency when it is (a) non-expired,
 * (b) scoped to that emergency (or platform-wide), and (c) its role lists the
 * permission. Platform-scoped grants (e.g. platform_admin) apply to every
 * emergency, matching how the backend PDP resolves the platform scope as an
 * ancestor of every resource.
 */
import type { MeGrant, RoleCatalogEntry } from '@/lib/admin-scopes';

export interface EmergencyAccess {
  /** Role ids the principal holds that apply to this emergency (deduped). */
  roleIds: string[];
  /** The union of permissions those roles confer at this emergency. */
  permissions: Set<string>;
  canValidateNeeds: boolean;
  canVerifyResources: boolean;
  canMatchOffers: boolean;
  /** Any coordinator-grade capability (volunteers / reports / renew …). */
  canCoordinate: boolean;
  /** True when the principal can act on at least one coordination queue. */
  canActOnAnyQueue: boolean;
}

/** Permissions that mean "this person runs coordinator-only surfaces". */
const COORDINATOR_PERMISSIONS = [
  'need:prioritize',
  'report:triage',
  'task:assign',
  'task:create',
  'offer:match',
];

export function resolveEmergencyAccess(
  emergencyId: string,
  grants: MeGrant[],
  roles: RoleCatalogEntry[],
  now: number = Date.now(),
): EmergencyAccess {
  const permsByRole = new Map(roles.map((r) => [r.id, new Set(r.permissions)]));
  const roleIds: string[] = [];
  const permissions = new Set<string>();

  for (const g of grants) {
    if (g.expiresAt && new Date(g.expiresAt).getTime() <= now) continue;
    // A grant applies here if it targets this emergency or the whole platform.
    const appliesHere =
      g.scopeType === 'platform' ||
      (g.scopeType === 'emergency' && g.scopeId === emergencyId);
    if (!appliesHere) continue;

    if (g.scopeType === 'emergency' && !roleIds.includes(g.roleId)) {
      roleIds.push(g.roleId);
    }
    const perms = permsByRole.get(g.roleId);
    if (perms) for (const p of perms) permissions.add(p);
  }

  const canValidateNeeds = permissions.has('need:validate');
  const canVerifyResources = permissions.has('resource:verify');
  const canMatchOffers = permissions.has('offer:match');
  const canCoordinate = COORDINATOR_PERMISSIONS.some((p) => permissions.has(p));

  return {
    roleIds,
    permissions,
    canValidateNeeds,
    canVerifyResources,
    canMatchOffers,
    canCoordinate,
    canActOnAnyQueue: canValidateNeeds || canVerifyResources || canMatchOffers,
  };
}
