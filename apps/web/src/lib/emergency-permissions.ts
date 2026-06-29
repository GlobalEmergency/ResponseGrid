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
  /** Can read the logistics shipments/capacities surfaces (#106). */
  canCoordinateLogistics: boolean;
  /** Any coordinator-grade capability (volunteers / reports / renew …). */
  canCoordinate: boolean;
  /** True when the principal can act on at least one coordination queue. */
  canActOnAnyQueue: boolean;
  /**
   * True when the principal may read this emergency's activity trail.
   * Coordinators (and platform admins/operators) hold `audit:read`; verifiers
   * do not — the log is coordinator-only.
   */
  canViewAudit: boolean;
  /** Can read this emergency's donation intakes (search / list / detail). */
  canReadIntakes: boolean;
  /** Can confirm / reject / mark-incomplete reception of donation intakes. */
  canReceiveIntakes: boolean;
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
  // The expediciones panel needs read access to shipments; creating/assigning
  // gates the write actions inside the panel (shipment:create / :assign).
  const canCoordinateLogistics = permissions.has('shipment:read');
  const canCoordinate = COORDINATOR_PERMISSIONS.some((p) => permissions.has(p));
  const canViewAudit = permissions.has('audit:read');
  const canReadIntakes = permissions.has('intake:read');
  const canReceiveIntakes = permissions.has('intake:receive');

  return {
    roleIds,
    permissions,
    canValidateNeeds,
    canVerifyResources,
    canMatchOffers,
    canCoordinateLogistics,
    canCoordinate,
    canActOnAnyQueue: canValidateNeeds || canVerifyResources || canMatchOffers,
    canViewAudit,
    canReadIntakes,
    canReceiveIntakes,
  };
}

/**
 * Permissions that mean "this principal can validate or coordinate an
 * emergency". Any one of them grants reach into a coordination/validation
 * queue — `need:validate` / `resource:verify` (the validation surfaces),
 * `offer:match`, plus the coordinator-grade capabilities.
 */
const PLATFORM_COORDINATION_PERMISSIONS = [
  'need:validate',
  'resource:verify',
  'offer:match',
  ...COORDINATOR_PERMISSIONS,
];

/**
 * True when the principal can coordinate/validate at the PLATFORM level —
 * i.e. holds a non-expired **platform-scoped** grant whose role confers any
 * coordination/validation permission. Because platform grants resolve as an
 * ancestor of every emergency, such a principal (e.g. `platform_admin`,
 * `platform_operator`) can validate ANY active emergency even with no
 * emergency-scoped grant. Used to surface the active-emergencies overlay in
 * the panel so admins/operators reach validation in one click; a plain
 * citizen (no platform coordination grant) gets `false` and never sees it.
 */
export function canCoordinateAtPlatform(
  grants: MeGrant[],
  roles: RoleCatalogEntry[],
  now: number = Date.now(),
): boolean {
  const permsByRole = new Map(roles.map((r) => [r.id, new Set(r.permissions)]));
  for (const g of grants) {
    if (g.scopeType !== 'platform') continue;
    if (g.expiresAt && new Date(g.expiresAt).getTime() <= now) continue;
    const perms = permsByRole.get(g.roleId);
    if (perms == null) continue;
    if (PLATFORM_COORDINATION_PERMISSIONS.some((p) => perms.has(p))) return true;
  }
  return false;
}
