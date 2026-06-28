import { GrantRepository } from '../domain/ports/grant.repository';
import {
  AccessControl,
  AuthorizationContext,
} from '../domain/authorization/access-control';
import { ancestorChain } from '../domain/authorization/scope-ref';
import {
  GrantNotFoundError,
  NotAuthorizedToRevokeError,
} from '../domain/authorization/errors';

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
  ) {}

  async execute(cmd: RevokeGrantCommand): Promise<void> {
    const grant = await this.grants.findById(cmd.grantId);
    if (!grant) {
      throw new GrantNotFoundError(cmd.grantId);
    }

    const chain = ancestorChain(grant.scope.toPlain());
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
