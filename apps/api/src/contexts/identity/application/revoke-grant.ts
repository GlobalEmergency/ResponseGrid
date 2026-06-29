import { GrantRepository } from '../domain/ports/grant.repository';
import {
  AccessControl,
  AuthorizationContext,
} from '../domain/authorization/access-control';
import {
  CannotRevokeOwnAdminError,
  GrantNotFoundError,
  LegacyGrantNotRevocableError,
  NotAuthorizedToRevokeError,
} from '../domain/authorization/errors';
import { ResourceEmergencyLookup } from '../domain/ports/resource-emergency-lookup';
import { authorizationChainForScope } from './scope-chain';

export interface RevokeGrantCommand {
  actor: AuthorizationContext;
  grantId: string;
}

/**
 * Revokes a grant. The actor must hold `role:revoke` at the revoked grant's
 * scope (or an ancestor) — the mirror of the delegation rule (docs/features/13
 * §5). Revocation takes effect on the next token refresh under the JWT model
 * (D3); see §9 for the mitigation path.
 */
export class RevokeGrant {
  constructor(
    private readonly grants: GrantRepository,
    private readonly access: AccessControl,
    private readonly resourceEmergencyLookup: ResourceEmergencyLookup,
  ) {}

  async execute(cmd: RevokeGrantCommand): Promise<void> {
    // Legacy-derived grants are not persisted rows; they carry a `legacy:` id and
    // would otherwise surface as a misleading "not found". Reject them clearly.
    if (cmd.grantId.startsWith('legacy:')) {
      throw new LegacyGrantNotRevocableError(cmd.grantId);
    }

    const grant = await this.grants.findById(cmd.grantId);
    if (!grant) {
      throw new GrantNotFoundError(cmd.grantId);
    }

    // Self-lockout guard: an admin must not revoke their own platform_admin
    // grant. Removing other admins still requires platform `role:revoke` below.
    if (
      grant.principalId === cmd.actor.principalId &&
      grant.roleId === 'platform_admin' &&
      grant.scope.type === 'platform'
    ) {
      throw new CannotRevokeOwnAdminError();
    }

    const chain = await authorizationChainForScope(
      grant.scope.toPlain(),
      this.resourceEmergencyLookup,
    );
    const actorPermissions = await this.access.effectivePermissions(
      cmd.actor,
      chain,
    );
    if (!actorPermissions.has('role:revoke')) {
      throw new NotAuthorizedToRevokeError(grant.scope.toPlain());
    }

    await this.grants.deleteById(cmd.grantId);
  }
}
