import { ServiceAccountRepository } from '../../identity/domain/ports/service-account.repository';
import { ApiKeyRepository } from '../../identity/domain/ports/api-key.repository';
import {
  ServiceAccountReader,
  OrganizationServiceAccount,
} from '../domain/ports/service-account-reader';

/**
 * Adapts the identity context's service-account / API-key repositories to the
 * organizations context's {@link ServiceAccountReader} output port. Computes the
 * per-account key tallies (total + active) so the application orchestrates a
 * single port (DIP / anti-corruption).
 */
export class ServiceAccountReaderAdapter implements ServiceAccountReader {
  constructor(
    private readonly serviceAccounts: ServiceAccountRepository,
    private readonly apiKeys: ApiKeyRepository,
  ) {}

  async listForOrganization(
    organizationId: string,
  ): Promise<OrganizationServiceAccount[]> {
    const accounts =
      await this.serviceAccounts.listByOrganization(organizationId);
    const now = new Date();

    return Promise.all(
      accounts.map(async (sa): Promise<OrganizationServiceAccount> => {
        const keys = await this.apiKeys.listByServiceAccount(sa.id);
        return {
          id: sa.id,
          name: sa.name,
          createdAt: sa.createdAt.toISOString(),
          keyCount: keys.length,
          activeKeyCount: keys.filter((k) => k.isActive(now)).length,
        };
      }),
    );
  }
}
