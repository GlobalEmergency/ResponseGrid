import { FindUserByEmail } from './find-user-by-email';
import { InMemoryUserRepository } from '../infrastructure/in-memory-user.repository';
import { LocalAccessControl } from '../domain/authorization/local-access-control';
import { AuthorizationContext } from '../domain/authorization/access-control';
import { Grant } from '../domain/authorization/grant';
import { ScopeRef } from '../domain/authorization/scope-ref';
import { NotAuthorizedToReadError } from '../domain/authorization/errors';
import { User } from '../domain/user';
import { UserId } from '../domain/user-id';
import { Email } from '../domain/email';

const PLATFORM_ADMIN = '11111111-1111-4111-8111-111111111111';
const ALICE = '33333333-3333-4333-8333-333333333333';

function platformAdmin(): AuthorizationContext {
  return {
    principalId: PLATFORM_ADMIN,
    grants: [
      Grant.create({
        id: 'g',
        principalId: PLATFORM_ADMIN,
        roleId: 'platform_admin',
        scope: ScopeRef.platform(),
      }).toSnapshot(),
    ],
  };
}

function outsider(): AuthorizationContext {
  return { principalId: ALICE, grants: [] };
}

describe('FindUserByEmail', () => {
  const access = new LocalAccessControl();
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

  it('resolves an email to a principal id for a platform admin', async () => {
    const result = await new FindUserByEmail(users, access).execute({
      actor: platformAdmin(),
      email: 'alice@example.org',
    });
    expect(result).toEqual({
      id: ALICE,
      email: 'alice@example.org',
      name: 'Alice',
    });
  });

  it('is case/space-insensitive (email is normalized)', async () => {
    const result = await new FindUserByEmail(users, access).execute({
      actor: platformAdmin(),
      email: '  ALICE@example.org ',
    });
    expect(result?.id).toBe(ALICE);
  });

  it('returns null for an unknown or malformed email', async () => {
    const uc = new FindUserByEmail(users, access);
    expect(
      await uc.execute({ actor: platformAdmin(), email: 'nobody@example.org' }),
    ).toBeNull();
    expect(
      await uc.execute({ actor: platformAdmin(), email: 'not-an-email' }),
    ).toBeNull();
  });

  it('forbids lookup without role:grant or user:read at platform', async () => {
    await expect(
      new FindUserByEmail(users, access).execute({
        actor: outsider(),
        email: 'alice@example.org',
      }),
    ).rejects.toThrow(NotAuthorizedToReadError);
  });
});
