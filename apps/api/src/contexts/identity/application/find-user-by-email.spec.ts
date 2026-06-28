import { FindUserByEmail } from './find-user-by-email';
import { InMemoryUserRepository } from '../infrastructure/in-memory-user.repository';
import { AuthorizationContext } from '../domain/authorization/access-control';
import { Grant } from '../domain/authorization/grant';
import { ScopeRef } from '../domain/authorization/scope-ref';
import { NotAuthorizedToReadError } from '../domain/authorization/errors';
import { User } from '../domain/user';
import { UserId } from '../domain/user-id';
import { Email } from '../domain/email';

const ALICE = '33333333-3333-4333-8333-333333333333';

function actorWith(...held: Grant[]): AuthorizationContext {
  return { principalId: 'actor', grants: held.map((g) => g.toSnapshot()) };
}

function grant(roleId: string, scope: ScopeRef): Grant {
  return Grant.create({
    id: `g-${roleId}`,
    principalId: 'actor',
    roleId,
    scope,
  });
}

describe('FindUserByEmail', () => {
  let users: InMemoryUserRepository;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    await users.save(
      User.create({
        id: UserId.fromString(ALICE),
        email: Email.fromString('alice@example.org'),
        passwordHash: null,
        name: 'Alice',
        isAdmin: false,
      }),
    );
  });

  it('resolves an email for a platform admin', async () => {
    const result = await new FindUserByEmail(users).execute({
      actor: actorWith(grant('platform_admin', ScopeRef.platform())),
      email: 'alice@example.org',
    });
    expect(result).toEqual({
      id: ALICE,
      email: 'alice@example.org',
      name: 'Alice',
    });
  });

  it('resolves an email for an org admin (scoped manager, not just platform)', async () => {
    const result = await new FindUserByEmail(users).execute({
      actor: actorWith(grant('org_admin', ScopeRef.organization('o1'))),
      email: '  ALICE@example.org ',
    });
    expect(result?.id).toBe(ALICE);
  });

  it('returns null for an unknown or malformed email', async () => {
    const uc = new FindUserByEmail(users);
    const admin = actorWith(grant('platform_admin', ScopeRef.platform()));
    expect(
      await uc.execute({ actor: admin, email: 'nobody@example.org' }),
    ).toBeNull();
    expect(
      await uc.execute({ actor: admin, email: 'not-an-email' }),
    ).toBeNull();
  });

  it('forbids a non-manager (e.g. a plain org member)', async () => {
    await expect(
      new FindUserByEmail(users).execute({
        actor: actorWith(grant('org_member', ScopeRef.organization('o1'))),
        email: 'alice@example.org',
      }),
    ).rejects.toThrow(NotAuthorizedToReadError);
  });

  it('forbids a principal with no grants', async () => {
    await expect(
      new FindUserByEmail(users).execute({
        actor: { principalId: 'nobody', grants: [] },
        email: 'alice@example.org',
      }),
    ).rejects.toThrow(NotAuthorizedToReadError);
  });
});
