import { ListGrantsAtScope } from './list-grants-at-scope';
import { InMemoryGrantRepository } from '../infrastructure/in-memory-grant.repository';
import { InMemoryUserRepository } from '../infrastructure/in-memory-user.repository';
import { InMemoryServiceAccountRepository } from '../infrastructure/in-memory-service-account.repository';
import { LocalAccessControl } from '../domain/authorization/local-access-control';
import { AuthorizationContext } from '../domain/authorization/access-control';
import { Grant } from '../domain/authorization/grant';
import { ScopeRef } from '../domain/authorization/scope-ref';
import { NotAuthorizedToReadError } from '../domain/authorization/errors';
import { User } from '../domain/user';
import { UserId } from '../domain/user-id';
import { Email } from '../domain/email';
import { ResourceEmergencyLookup } from '../domain/ports/resource-emergency-lookup';

const PLATFORM_ADMIN = '11111111-1111-4111-8111-111111111111';
const ORG_ADMIN = '22222222-2222-4222-8222-222222222222';
const MEMBER = '33333333-3333-4333-8333-333333333333';
const COORDINATOR = '44444444-4444-4444-8444-444444444444';
const ORG = 'org-1';
const OTHER_ORG = 'org-2';
const EMERGENCY = 'e-1';

function ctx(principalId: string, ...held: Grant[]): AuthorizationContext {
  return { principalId, grants: held.map((g) => g.toSnapshot()) };
}

const access = new LocalAccessControl();

function resourceEmergencyLookup(
  map: Record<string, string>,
): ResourceEmergencyLookup {
  return {
    findEmergencyId: (resourceId: string) =>
      Promise.resolve(map[resourceId] ?? null),
  };
}

describe('ListGrantsAtScope', () => {
  let grants: InMemoryGrantRepository;
  let users: InMemoryUserRepository;
  let serviceAccounts: InMemoryServiceAccountRepository;

  function useCase(): ListGrantsAtScope {
    return new ListGrantsAtScope(
      grants,
      access,
      users,
      serviceAccounts,
      resourceEmergencyLookup({ r1: EMERGENCY }),
    );
  }

  beforeEach(async () => {
    grants = new InMemoryGrantRepository();
    users = new InMemoryUserRepository();
    serviceAccounts = new InMemoryServiceAccountRepository();

    await users.save(
      User.create({
        id: UserId.fromString(MEMBER),
        email: Email.fromString('mia@example.org'),
        passwordHash: null,
        name: 'Mia',
        isAdmin: false,
      }),
    );
    await grants.save(
      Grant.create({
        id: 'm1',
        principalId: MEMBER,
        roleId: 'org_member',
        scope: ScopeRef.organization(ORG),
      }),
    );
    await grants.save(
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

  it('lists the grants at the org, enriched with the principal name/email', async () => {
    const result = await useCase().execute({
      actor: orgAdmin(),
      scope: ScopeRef.organization(ORG).toPlain(),
    });
    expect(result).toHaveLength(2);
    const member = result.find((v) => v.grant.principalId === MEMBER);
    expect(member?.principalName).toBe('Mia');
    expect(member?.principalEmail).toBe('mia@example.org');
    // The org admin user has no User row → name/email resolve to null gracefully.
    const admin = result.find((v) => v.grant.principalId === ORG_ADMIN);
    expect(admin?.principalName).toBeNull();
  });

  it('lets a platform admin list grants at any organization', async () => {
    const result = await useCase().execute({
      actor: platformAdmin(),
      scope: ScopeRef.organization(ORG).toPlain(),
    });
    expect(result).toHaveLength(2);
  });

  it('forbids an org admin from listing a different organization', async () => {
    await expect(
      useCase().execute({
        actor: orgAdmin(),
        scope: ScopeRef.organization(OTHER_ORG).toPlain(),
      }),
    ).rejects.toThrow(NotAuthorizedToReadError);
  });

  it('forbids a principal with no admin permission at the scope', async () => {
    await expect(
      useCase().execute({
        actor: ctx(MEMBER),
        scope: ScopeRef.organization(ORG).toPlain(),
      }),
    ).rejects.toThrow(NotAuthorizedToReadError);
  });

  it('lets an emergency coordinator list grants for a resource in their emergency', async () => {
    await grants.save(
      Grant.create({
        id: 'r1g',
        principalId: MEMBER,
        roleId: 'point_manager',
        scope: ScopeRef.entity('resource', 'r1'),
      }),
    );

    const result = await useCase().execute({
      actor: ctx(
        COORDINATOR,
        Grant.create({
          id: 'ec',
          principalId: COORDINATOR,
          roleId: 'emergency_coordinator',
          scope: ScopeRef.emergency(EMERGENCY),
        }),
      ),
      scope: ScopeRef.entity('resource', 'r1').toPlain(),
    });

    expect(result).toHaveLength(1);
    expect(result[0].grant.roleId).toBe('point_manager');
  });
});
