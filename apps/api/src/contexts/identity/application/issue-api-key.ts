import { randomUUID } from 'node:crypto';
import { ServiceAccountRepository } from '../domain/ports/service-account.repository';
import { ApiKeyRepository } from '../domain/ports/api-key.repository';
import {
  AccessControl,
  AuthorizationContext,
} from '../domain/authorization/access-control';
import { ancestorChain } from '../domain/authorization/scope-ref';
import { ApiKey } from '../domain/api-key';
import { generateApiKey, hashApiKeySecret } from '../domain/api-key-generator';
import {
  ApiKeyAccessDeniedError,
  ServiceAccountNotFoundError,
} from '../domain/api-key-errors';
import { machineScope } from './api-key-scope';

export interface IssueApiKeyCommand {
  actor: AuthorizationContext;
  serviceAccountId: string;
  expiresAt?: Date | null;
}

export interface IssuedApiKey {
  id: string;
  /** The full secret — return to the caller exactly once, then never again. */
  plaintext: string;
  prefix: string;
}

export class IssueApiKey {
  constructor(
    private readonly serviceAccounts: ServiceAccountRepository,
    private readonly keys: ApiKeyRepository,
    private readonly access: AccessControl,
  ) {}

  async execute(cmd: IssueApiKeyCommand): Promise<IssuedApiKey> {
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

    const generated = generateApiKey();
    const key = ApiKey.issue({
      id: randomUUID(),
      prefix: generated.prefix,
      hashedSecret: hashApiKeySecret(generated.plaintext),
      serviceAccountId: serviceAccount.id,
      createdByUserId: cmd.actor.principalId,
      expiresAt: cmd.expiresAt ?? null,
    });
    await this.keys.save(key);

    return {
      id: key.id,
      plaintext: generated.plaintext,
      prefix: generated.prefix,
    };
  }
}
