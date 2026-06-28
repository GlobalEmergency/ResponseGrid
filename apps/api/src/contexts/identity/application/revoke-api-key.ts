import { ServiceAccountRepository } from '../domain/ports/service-account.repository';
import { ApiKeyRepository } from '../domain/ports/api-key.repository';
import {
  AccessControl,
  AuthorizationContext,
} from '../domain/authorization/access-control';
import { ancestorChain } from '../domain/authorization/scope-ref';
import {
  ApiKeyAccessDeniedError,
  ApiKeyNotFoundError,
} from '../domain/api-key-errors';
import { machineScope } from './api-key-scope';

export interface RevokeApiKeyCommand {
  actor: AuthorizationContext;
  keyId: string;
}

export class RevokeApiKey {
  constructor(
    private readonly serviceAccounts: ServiceAccountRepository,
    private readonly keys: ApiKeyRepository,
    private readonly access: AccessControl,
  ) {}

  async execute(cmd: RevokeApiKeyCommand): Promise<void> {
    const key = await this.keys.findById(cmd.keyId);
    if (!key) throw new ApiKeyNotFoundError(cmd.keyId);

    const serviceAccount = await this.serviceAccounts.findById(
      key.serviceAccountId,
    );
    const allowed = await this.access.can(cmd.actor, 'apikey:revoke', {
      scopeChain: ancestorChain(
        machineScope(serviceAccount?.ownerOrganizationId ?? null),
      ),
    });
    if (!allowed) throw new ApiKeyAccessDeniedError('apikey:revoke');

    await this.keys.save(key.revoke(new Date()));
  }
}
