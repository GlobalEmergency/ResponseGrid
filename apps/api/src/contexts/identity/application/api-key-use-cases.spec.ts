import { CreateServiceAccount } from './create-service-account';
import { IssueApiKey } from './issue-api-key';
import { RevokeApiKey } from './revoke-api-key';
import { InMemoryServiceAccountRepository } from '../infrastructure/in-memory-service-account.repository';
import { InMemoryApiKeyRepository } from '../infrastructure/in-memory-api-key.repository';
import { LocalAccessControl } from '../domain/authorization/local-access-control';
import { AuthorizationContext } from '../domain/authorization/access-control';
import { Grant } from '../domain/authorization/grant';
import { ScopeRef } from '../domain/authorization/scope-ref';
import { prefixOf, verifyApiKeySecret } from '../domain/api-key-generator';
import {
  ApiKeyAccessDeniedError,
  ApiKeyNotFoundError,
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

describe('API key use cases', () => {
  const access = new LocalAccessControl();
  let sas: InMemoryServiceAccountRepository;
  let keys: InMemoryApiKeyRepository;

  beforeEach(() => {
    sas = new InMemoryServiceAccountRepository();
    keys = new InMemoryApiKeyRepository();
  });

  it('org_admin creates a service account in their org', async () => {
    const { id } = await new CreateServiceAccount(sas, access).execute({
      actor: orgAdmin(),
      name: 'CI bot',
      ownerOrganizationId: ORG,
    });
    expect(await sas.findById(id)).not.toBeNull();
  });

  it('a principal without apikey:create cannot create one', async () => {
    await expect(
      new CreateServiceAccount(sas, access).execute({
        actor: outsider(),
        name: 'x',
        ownerOrganizationId: ORG,
      }),
    ).rejects.toThrow(ApiKeyAccessDeniedError);
  });

  it('issues a key whose secret verifies against the stored hash, never persisting plaintext', async () => {
    const { id: saId } = await new CreateServiceAccount(sas, access).execute({
      actor: orgAdmin(),
      name: 'CI bot',
      ownerOrganizationId: ORG,
    });
    const issued = await new IssueApiKey(sas, keys, access).execute({
      actor: orgAdmin(),
      serviceAccountId: saId,
    });

    expect(issued.plaintext.startsWith('rh_live_')).toBe(true);
    const prefix = prefixOf(issued.plaintext);
    expect(prefix).not.toBeNull();
    const stored = await keys.findByPrefix(prefix as string);
    expect(stored).not.toBeNull();
    expect(
      verifyApiKeySecret(issued.plaintext, (stored as ApiKeyLike).hashedSecret),
    ).toBe(true);
    expect((stored as ApiKeyLike).hashedSecret).not.toContain(issued.plaintext);
  });

  it('issuing for a missing service account throws', async () => {
    await expect(
      new IssueApiKey(sas, keys, access).execute({
        actor: orgAdmin(),
        serviceAccountId: '00000000-0000-4000-8000-000000000000',
      }),
    ).rejects.toThrow(ServiceAccountNotFoundError);
  });

  it('revokes a key so it becomes inactive', async () => {
    const { id: saId } = await new CreateServiceAccount(sas, access).execute({
      actor: orgAdmin(),
      name: 'CI bot',
      ownerOrganizationId: ORG,
    });
    const issued = await new IssueApiKey(sas, keys, access).execute({
      actor: orgAdmin(),
      serviceAccountId: saId,
    });
    await new RevokeApiKey(sas, keys, access).execute({
      actor: orgAdmin(),
      keyId: issued.id,
    });
    const stored = await keys.findById(issued.id);
    expect((stored as ApiKeyLike).isActive(new Date())).toBe(false);
  });

  it('revoking a missing key throws', async () => {
    await expect(
      new RevokeApiKey(sas, keys, access).execute({
        actor: orgAdmin(),
        keyId: '00000000-0000-4000-8000-000000000000',
      }),
    ).rejects.toThrow(ApiKeyNotFoundError);
  });
});

interface ApiKeyLike {
  hashedSecret: string;
  isActive(now: Date): boolean;
}
