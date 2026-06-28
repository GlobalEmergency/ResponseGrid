import { GrantSnapshot } from './grant';
import { MembershipSnapshot } from '../membership';

const LEGACY_ROLE_TO_ROLE_ID: Record<string, string | undefined> = {
  coordinator: 'emergency_coordinator',
  verifier: 'emergency_verifier',
};

/** Fixed origin timestamp — legacy-derived grants are not time-bound. */
const LEGACY_GRANTED_AT = new Date(0).toISOString();

/**
 * Bridges the legacy authorization sources (`users.is_admin` + `memberships`)
 * to the new grant model, in memory and with no extra DB call.
 *
 * During the transition (docs/features/13 §9, decision D3) the legacy tables
 * stay the source of truth for these roles, so deriving live avoids any
 * dual-write staleness. The `grants` table is the persistent home for the new
 * role types (group managers, delegated roles, break-glass, service accounts)
 * that legacy tables cannot express; a later slice flips the guard to read it.
 */
export function deriveGrantsFromLegacy(
  userId: string,
  isAdmin: boolean,
  memberships: MembershipSnapshot[],
): GrantSnapshot[] {
  const grants: GrantSnapshot[] = [];

  if (isAdmin) {
    grants.push({
      id: `legacy:admin:${userId}`,
      principalId: userId,
      principalType: 'user',
      roleId: 'platform_admin',
      scope: { type: 'platform' },
      grantedByPrincipalId: null,
      grantedAt: LEGACY_GRANTED_AT,
      expiresAt: null,
    });
  }

  for (const membership of memberships) {
    const roleId = LEGACY_ROLE_TO_ROLE_ID[membership.role];
    if (roleId === undefined) continue;
    grants.push({
      id: `legacy:membership:${membership.id}`,
      principalId: userId,
      principalType: 'user',
      roleId,
      scope: { type: 'emergency', id: membership.emergencyId },
      grantedByPrincipalId: null,
      grantedAt: LEGACY_GRANTED_AT,
      expiresAt: null,
    });
  }

  return grants;
}
