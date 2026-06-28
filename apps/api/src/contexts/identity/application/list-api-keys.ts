import { ApiKeySnapshot } from '../domain/api-key';
import { ApiKeyRepository } from '../domain/ports/api-key.repository';
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

export interface ListApiKeysCommand {
  actor: AuthorizationContext;
  serviceAccountId: string;
}

/**
 * Lists a service account's API keys (metadata only — the secret is shown once
 * at issue time, docs/features/13 §8.3). Authorized like key creation:
 * `apikey:create` in the account's machine scope, so an org admin can manage
 * the keys of their own org's accounts (not only platform admins).
 */
export class ListApiKeys {
  constructor(
    private readonly serviceAccounts: ServiceAccountRepository,
    private readonly keys: ApiKeyRepository,
    private readonly access: AccessControl,
  ) {}

  async execute(cmd: ListApiKeysCommand): Promise<ApiKeySnapshot[]> {
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

    const keys = await this.keys.listByServiceAccount(cmd.serviceAccountId);
    return keys.map((k) => k.toSnapshot());
  }
}
