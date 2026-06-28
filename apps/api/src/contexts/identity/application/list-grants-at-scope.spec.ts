import { ListGrantsAtScope } from './list-grants-at-scope';
import { InMemoryGrantRepository } from '../infrastructure/in-memory-grant.repository';
import { LocalAccessControl } from '../domain/authorization/local-access-control';
import { AuthorizationContext } from '../domain/authorization/access-control';
import { Grant } from '../domain/authorization/grant';
import { ScopeRef } from '../domain/authorization/scope-ref';
import { NotAuthorizedToReadError } from '../domain/authorization/errors';

const PLATFORM_ADMIN = '11111111-1111-4111-8111-111111111111';
const ORG_ADMIN = '22222222-2222-4222-8222-222222222222';
const MEMBER = '33333333-3333-4333-8333-333333333333';
const ORG = 'org-1';
const OTHER_ORG = 'org-2';

function ctx(principalId: string, ...held: Grant[]): AuthorizationContext {
  return { principalId, grants: held.map((g) => g.toSnapshot()) };
}

describe('ListGrantsAtScope', () => {
  const access = new LocalAccessControl();
  let repo: InMemoryGrantRepository;

  beforeEach(async () => {
    repo = new InMemoryGrantRepository();
    // A member with org_member at ORG, plus the org admin's own grant at ORG.
    await repo.save(
      Grant.create({
        id: 'm1',
        principalId: MEMBER,
        roleId: 'org_member',
        scope: ScopeRef.organization(ORG),
      }),
    );
    await repo.save(
      Grant.create({
        id: 'oa',
        principalId: ORG_ADMIN,
        roleId: 'org_admin',
        scope: ScopeRef.organization(ORG),
      }),
    );
  });

  function orgAdmin(): AuthorizationContext {
    return ctx(
      ORG_ADMIN,
      Grant.create({
        id: 'oa',
        principalId: ORG_ADMIN,
        roleId: 'org_admin',
        scope: ScopeRef.organization(ORG),
      }),
    );
  }

  function platformAdmin(): AuthorizationContext {
    return ctx(
      PLATFORM_ADMIN,
      Grant.create({
        id: 'pa',
        principalId: PLATFORM_ADMIN,
        roleId: 'platform_admin',
        scope: ScopeRef.platform(),
      }),
    );
  }

  it('lets an org admin list the grants at their own organization', async () => {
    const result = await new ListGrantsAtScope(repo, access).execute({
      actor: orgAdmin(),
      scope: ScopeRef.organization(ORG).toPlain(),
    });
    expect(result.map((g) => g.principalId).sort()).toEqual(
      [MEMBER, ORG_ADMIN].sort(),
    );
  });

  it('lets a platform admin list grants at any organization', async () => {
    const result = await new ListGrantsAtScope(repo, access).execute({
      actor: platformAdmin(),
      scope: ScopeRef.organization(ORG).toPlain(),
    });
    expect(result).toHaveLength(2);
  });

  it('forbids an org admin from listing a different organization', async () => {
    await expect(
      new ListGrantsAtScope(repo, access).execute({
        actor: orgAdmin(),
        scope: ScopeRef.organization(OTHER_ORG).toPlain(),
      }),
    ).rejects.toThrow(NotAuthorizedToReadError);
  });

  it('forbids a principal with no admin permission at the scope', async () => {
    await expect(
      new ListGrantsAtScope(repo, access).execute({
        actor: ctx(MEMBER),
        scope: ScopeRef.organization(ORG).toPlain(),
      }),
    ).rejects.toThrow(NotAuthorizedToReadError);
  });
});
