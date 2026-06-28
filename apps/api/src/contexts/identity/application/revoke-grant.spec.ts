import { RevokeGrant } from './revoke-grant';
import { InMemoryGrantRepository } from '../infrastructure/in-memory-grant.repository';
import { LocalAccessControl } from '../domain/authorization/local-access-control';
import { AuthorizationContext } from '../domain/authorization/access-control';
import { Grant } from '../domain/authorization/grant';
import { ScopeRef } from '../domain/authorization/scope-ref';
import {
  GrantNotFoundError,
  NotAuthorizedToRevokeError,
} from '../domain/authorization/errors';

const ACTOR = '11111111-1111-4111-8111-111111111111';
const TARGET = '22222222-2222-4222-8222-222222222222';
const GRANT_ID = '33333333-3333-4333-8333-333333333333';

function actorWith(
  ...held: { roleId: string; scope: ScopeRef }[]
): AuthorizationContext {
  return {
    principalId: ACTOR,
    grants: held.map((g, i) =>
      Grant.create({
        id: `a${i}`,
        principalId: ACTOR,
        roleId: g.roleId,
        scope: g.scope,
      }).toSnapshot(),
    ),
  };
}

async function seedTargetGrant(repo: InMemoryGrantRepository): Promise<void> {
  await repo.save(
    Grant.create({
      id: GRANT_ID,
      principalId: TARGET,
      roleId: 'emergency_coordinator',
      scope: ScopeRef.emergency('e1'),
    }),
  );
}

describe('RevokeGrant', () => {
  let repo: InMemoryGrantRepository;
  let useCase: RevokeGrant;

  beforeEach(() => {
    repo = new InMemoryGrantRepository();
    useCase = new RevokeGrant(repo, new LocalAccessControl());
  });

  it('a platform_admin can revoke a grant', async () => {
    await seedTargetGrant(repo);
    const actor = actorWith({
      roleId: 'platform_admin',
      scope: ScopeRef.platform(),
    });
    await useCase.execute({ actor, grantId: GRANT_ID });
    expect(await repo.findById(GRANT_ID)).toBeNull();
  });

  it('throws when the grant does not exist', async () => {
    const actor = actorWith({
      roleId: 'platform_admin',
      scope: ScopeRef.platform(),
    });
    await expect(useCase.execute({ actor, grantId: GRANT_ID })).rejects.toThrow(
      GrantNotFoundError,
    );
  });

  it('forbids an actor without role:revoke at the grant scope', async () => {
    await seedTargetGrant(repo);
    const actor = actorWith({
      roleId: 'volunteer_operative',
      scope: ScopeRef.emergency('e1'),
    });
    await expect(useCase.execute({ actor, grantId: GRANT_ID })).rejects.toThrow(
      NotAuthorizedToRevokeError,
    );
  });
});
