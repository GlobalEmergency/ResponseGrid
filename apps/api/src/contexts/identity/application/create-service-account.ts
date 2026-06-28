import { randomUUID } from 'node:crypto';
import { ServiceAccountRepository } from '../domain/ports/service-account.repository';
import {
  AccessControl,
  AuthorizationContext,
} from '../domain/authorization/access-control';
import { ancestorChain } from '../domain/authorization/scope-ref';
import { ServiceAccount } from '../domain/service-account';
import { ApiKeyAccessDeniedError } from '../domain/api-key-errors';
import { machineScope } from './api-key-scope';

export interface CreateServiceAccountCommand {
  actor: AuthorizationContext;
  name: string;
  ownerOrganizationId: string | null;
}

export class CreateServiceAccount {
  constructor(
    private readonly serviceAccounts: ServiceAccountRepository,
    private readonly access: AccessControl,
  ) {}

  async execute(cmd: CreateServiceAccountCommand): Promise<{ id: string }> {
    const allowed = await this.access.can(cmd.actor, 'apikey:create', {
      scopeChain: ancestorChain(machineScope(cmd.ownerOrganizationId)),
    });
    if (!allowed) throw new ApiKeyAccessDeniedError('apikey:create');

    const serviceAccount = ServiceAccount.create({
      id: randomUUID(),
      name: cmd.name,
      ownerOrganizationId: cmd.ownerOrganizationId,
      createdByUserId: cmd.actor.principalId,
    });
    await this.serviceAccounts.save(serviceAccount);
    return { id: serviceAccount.id };
  }
}
