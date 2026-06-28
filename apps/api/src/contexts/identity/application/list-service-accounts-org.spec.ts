import { ListServiceAccountsByOrg } from './list-service-accounts-by-org';
import { ListApiKeys } from './list-api-keys';
import { CreateServiceAccount } from './create-service-account';
import { IssueApiKey } from './issue-api-key';
import { InMemoryServiceAccountRepository } from '../infrastructure/in-memory-service-account.repository';
import { InMemoryApiKeyRepository } from '../infrastructure/in-memory-api-key.repository';
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

describe('Org-scoped service account read use cases', () => {
  const access = new LocalAccessControl();
  let sas: InMemoryServiceAccountRepository;
  let keys: InMemoryApiKeyRepository;

  beforeEach(() => {
    sas = new InMemoryServiceAccountRepository();
    keys = new InMemoryApiKeyRepository();
  });

  it('lists the service accounts of the org for its admin', async () => {
    await new CreateServiceAccount(sas, access).execute({
      actor: orgAdmin(),
      name: 'org bot',
      ownerOrganizationId: ORG,
    });
    const result = await new ListServiceAccountsByOrg(sas, access).execute({
      actor: orgAdmin(),
      organizationId: ORG,
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('org bot');
  });

  it('forbids listing the org service accounts without apikey:create there', async () => {
    await expect(
      new ListServiceAccountsByOrg(sas, access).execute({
        actor: outsider(),
        organizationId: ORG,
      }),
    ).rejects.toThrow(ApiKeyAccessDeniedError);
  });

  it('lists the keys of a service account for the org admin', async () => {
    const { id: saId } = await new CreateServiceAccount(sas, access).execute({
      actor: orgAdmin(),
      name: 'org bot',
      ownerOrganizationId: ORG,
    });
    await new IssueApiKey(sas, keys, access).execute({
      actor: orgAdmin(),
      serviceAccountId: saId,
    });
    const result = await new ListApiKeys(sas, keys, access).execute({
      actor: orgAdmin(),
      serviceAccountId: saId,
    });
    expect(result).toHaveLength(1);
    expect(result[0].prefix.startsWith('rh_live_')).toBe(true);
  });

  it('throws for a missing service account', async () => {
    await expect(
      new ListApiKeys(sas, keys, access).execute({
        actor: orgAdmin(),
        serviceAccountId: '00000000-0000-4000-8000-000000000000',
      }),
    ).rejects.toThrow(ServiceAccountNotFoundError);
  });

  it('forbids listing keys of an account in an org you do not administer', async () => {
    const { id: saId } = await new CreateServiceAccount(sas, access).execute({
      actor: orgAdmin(),
      name: 'org bot',
      ownerOrganizationId: ORG,
    });
    await expect(
      new ListApiKeys(sas, keys, access).execute({
        actor: outsider(),
        serviceAccountId: saId,
      }),
    ).rejects.toThrow(ApiKeyAccessDeniedError);
  });
});
