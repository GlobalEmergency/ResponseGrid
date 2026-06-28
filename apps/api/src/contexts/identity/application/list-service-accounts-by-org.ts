import { ServiceAccountSnapshot } from '../domain/service-account';
import { ServiceAccountRepository } from '../domain/ports/service-account.repository';
import {
  AccessControl,
  AuthorizationContext,
} from '../domain/authorization/access-control';
import { ancestorChain } from '../domain/authorization/scope-ref';
import { ApiKeyAccessDeniedError } from '../domain/api-key-errors';
import { machineScope } from './api-key-scope';

export interface ListServiceAccountsByOrgCommand {
  actor: AuthorizationContext;
  organizationId: string;
}

/**
 * Lists the service accounts owned by an organization, for its admins. Mirrors
 * the write-side authorization (docs/features/13 §8): whoever can create keys in
 * the org's machine scope can list its service accounts.
 */
export class ListServiceAccountsByOrg {
  constructor(
    private readonly serviceAccounts: ServiceAccountRepository,
    private readonly access: AccessControl,
  ) {}

  async execute(
    cmd: ListServiceAccountsByOrgCommand,
  ): Promise<ServiceAccountSnapshot[]> {
    const allowed = await this.access.can(cmd.actor, 'apikey:create', {
      scopeChain: ancestorChain(machineScope(cmd.organizationId)),
    });
    if (!allowed) throw new ApiKeyAccessDeniedError('apikey:create');

    const accounts = await this.serviceAccounts.listByOrganization(
      cmd.organizationId,
    );
    return accounts.map((s) => s.toSnapshot());
  }
}
