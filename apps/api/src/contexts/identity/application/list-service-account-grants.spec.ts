import { CreateServiceAccount } from './create-service-account';
import { ListServiceAccountGrants } from './list-service-account-grants';
import { InMemoryServiceAccountRepository } from '../infrastructure/in-memory-service-account.repository';
import { InMemoryGrantRepository } from '../infrastructure/in-memory-grant.repository';
import { LocalAccessControl } from '../domain/authorization/local-access-control';
import { AuthorizationContext } from '../domain/authorization/access-control';
import { Grant } from '../domain/authorization/grant';
import { ScopeRef } from '../domain/authorization/scope-ref';
import {
  ApiKeyAccessDeniedError,
  ServiceAccountNotFoundError,
} from '../domain/api-key-errors';

const ORG = 'o1';
const ADMIN = '11111111-1111-4111-8111-111111111111';

function orgAdmin(): AuthorizationContext {
  return {
    principalId: ADMIN,
    grants: [
      Grant.create({
        id: 'g',
        principalId: ADMIN,
        roleId: 'org_admin',
        scope: ScopeRef.organization(ORG),
      }).toSnapshot(),
    ],
  };
}

function outsider(): AuthorizationContext {
  return { principalId: 'outsider', grants: [] };
}

describe('ListServiceAccountGrants', () => {
  const access = new LocalAccessControl();
  let sas: InMemoryServiceAccountRepository;
  let grants: InMemoryGrantRepository;

  beforeEach(() => {
    sas = new InMemoryServiceAccountRepository();
    grants = new InMemoryGrantRepository();
  });

  async function seedServiceAccount(): Promise<string> {
    const { id } = await new CreateServiceAccount(sas, access).execute({
      actor: orgAdmin(),
      name: 'CI bot',
      ownerOrganizationId: ORG,
    });
    return id;
  }

  it('lists the grants held by the service-account principal', async () => {
    const saId = await seedServiceAccount();
    await grants.save(
      Grant.create({
        id: 'sa-grant',
        principalId: saId,
        principalType: 'service_account',
        roleId: 'integration_partner',
        scope: ScopeRef.organization(ORG),
      }),
    );
    // A grant on a different principal must not leak in.
    await grants.save(
      Grant.create({
        id: 'other',
        principalId: 'someone-else',
        roleId: 'org_admin',
        scope: ScopeRef.organization(ORG),
      }),
    );

    const result = await new ListServiceAccountGrants(
      sas,
      grants,
      access,
    ).execute({ actor: orgAdmin(), serviceAccountId: saId });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'sa-grant',
      principalId: saId,
      principalType: 'service_account',
      roleId: 'integration_partner',
    });
  });

  it('returns an empty list for a service account with no grants', async () => {
    const saId = await seedServiceAccount();
    const result = await new ListServiceAccountGrants(
      sas,
      grants,
      access,
    ).execute({ actor: orgAdmin(), serviceAccountId: saId });
    expect(result).toEqual([]);
  });

  it('denies a principal without apikey:create in the account scope', async () => {
    const saId = await seedServiceAccount();
    await expect(
      new ListServiceAccountGrants(sas, grants, access).execute({
        actor: outsider(),
        serviceAccountId: saId,
      }),
    ).rejects.toThrow(ApiKeyAccessDeniedError);
  });

  it('throws for a missing service account', async () => {
    await expect(
      new ListServiceAccountGrants(sas, grants, access).execute({
        actor: orgAdmin(),
        serviceAccountId: '00000000-0000-4000-8000-000000000000',
      }),
    ).rejects.toThrow(ServiceAccountNotFoundError);
  });
});
