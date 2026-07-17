import { GrantSnapshot } from '../domain/authorization/grant';
import { GrantRepository } from '../domain/ports/grant.repository';
import { ServiceAccountRepository } from '../domain/ports/service-account.repository';
import {
  AccessControl,
  AuthorizationContext,
} from '../domain/authorization/access-control';
import { ancestorChain } from '../domain/authorization/scope-ref';
import {
  ApiKeyAccessDeniedError,
  ServiceAccountNotFoundError,
} from '../domain/api-key-errors';
import { machineScope } from './api-key-scope';

export interface ListServiceAccountGrantsCommand {
  actor: AuthorizationContext;
  serviceAccountId: string;
}

/**
 * Lists the grants held by a service account — the read side of "what can this
 * API key do". A key carries no permissions of its own: its authority is the set
 * of grants on its service-account principal (docs/features/13 §8). Authorized
 * exactly like key management (`apikey:create` in the account's machine scope),
 * so an org admin can inspect their own accounts, not only platform admins — the
 * platform-wide `GET /grants?principalId` stays admin-only.
 */
export class ListServiceAccountGrants {
  constructor(
    private readonly serviceAccounts: ServiceAccountRepository,
    private readonly grants: GrantRepository,
    private readonly access: AccessControl,
  ) {}

  async execute(
    cmd: ListServiceAccountGrantsCommand,
  ): Promise<GrantSnapshot[]> {
    const serviceAccount = await this.serviceAccounts.findById(
      cmd.serviceAccountId,
    );
    if (!serviceAccount) {
      throw new ServiceAccountNotFoundError(cmd.serviceAccountId);
    }

    const allowed = await this.access.can(cmd.actor, 'apikey:create', {
      scopeChain: ancestorChain(
        machineScope(serviceAccount.ownerOrganizationId),
      ),
    });
    if (!allowed) throw new ApiKeyAccessDeniedError('apikey:create');

    const grants = await this.grants.findByPrincipal(cmd.serviceAccountId);
    return grants.map((g) => g.toSnapshot());
  }
}
