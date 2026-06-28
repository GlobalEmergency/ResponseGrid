import { GrantRole } from './grant-role';
import { InMemoryGrantRepository } from '../infrastructure/in-memory-grant.repository';
import { LocalAccessControl } from '../domain/authorization/local-access-control';
import { AuthorizationContext } from '../domain/authorization/access-control';
import { Grant } from '../domain/authorization/grant';
import { ScopeRef } from '../domain/authorization/scope-ref';
import {
  NotAuthorizedToGrantError,
  PrivilegeEscalationError,
  UnknownRoleError,
} from '../domain/authorization/errors';

const ACTOR = '11111111-1111-4111-8111-111111111111';
const TARGET = '22222222-2222-4222-8222-222222222222';

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

describe('GrantRole (delegation with attenuation)', () => {
  let repo: InMemoryGrantRepository;
  let useCase: GrantRole;

  beforeEach(() => {
    repo = new InMemoryGrantRepository();
    useCase = new GrantRole(repo, new LocalAccessControl());
  });

  it('a platform_admin can grant emergency_coordinator and records the granter', async () => {
    const actor = actorWith({
      roleId: 'platform_admin',
      scope: ScopeRef.platform(),
    });
    const { id } = await useCase.execute({
      actor,
      targetPrincipalId: TARGET,
      roleId: 'emergency_coordinator',
      scope: ScopeRef.emergency('e1').toPlain(),
    });

    const saved = await repo.findByPrincipal(TARGET);
    expect(id).toBeTruthy();
    expect(saved).toHaveLength(1);
    expect(saved[0].roleId).toBe('emergency_coordinator');
    expect(saved[0].grantedByPrincipalId).toBe(ACTOR);
  });

  it('an org_admin can grant org_member within their organization', async () => {
    const actor = actorWith({
      roleId: 'org_admin',
      scope: ScopeRef.organization('o1'),
    });
    await expect(
      useCase.execute({
        actor,
        targetPrincipalId: TARGET,
        roleId: 'org_member',
        scope: ScopeRef.organization('o1').toPlain(),
      }),
    ).resolves.toBeDefined();
  });

  it('attenuation: an org_admin cannot grant platform_admin', async () => {
    const actor = actorWith({
      roleId: 'org_admin',
      scope: ScopeRef.organization('o1'),
    });
    await expect(
      useCase.execute({
        actor,
        targetPrincipalId: TARGET,
        roleId: 'platform_admin',
        scope: ScopeRef.organization('o1').toPlain(),
      }),
    ).rejects.toThrow(PrivilegeEscalationError);
  });

  it('a principal without role:grant cannot delegate', async () => {
    const actor = actorWith({
      roleId: 'emergency_coordinator',
      scope: ScopeRef.emergency('e1'),
    });
    await expect(
      useCase.execute({
        actor,
        targetPrincipalId: TARGET,
        roleId: 'volunteer_operative',
        scope: ScopeRef.emergency('e1').toPlain(),
      }),
    ).rejects.toThrow(NotAuthorizedToGrantError);
  });

  it('cannot grant in a scope the actor does not administer', async () => {
    const actor = actorWith({
      roleId: 'org_admin',
      scope: ScopeRef.organization('o1'),
    });
    await expect(
      useCase.execute({
        actor,
        targetPrincipalId: TARGET,
        roleId: 'org_member',
        scope: ScopeRef.organization('o2').toPlain(),
      }),
    ).rejects.toThrow(NotAuthorizedToGrantError);
  });

  it('rejects an unknown role', async () => {
    const actor = actorWith({
      roleId: 'platform_admin',
      scope: ScopeRef.platform(),
    });
    await expect(
      useCase.execute({
        actor,
        targetPrincipalId: TARGET,
        roleId: 'wizard',
        scope: ScopeRef.platform().toPlain(),
      }),
    ).rejects.toThrow(UnknownRoleError);
  });
});
