import { AuthenticateWithProvider } from './authenticate-with-provider';
import { InMemoryUserRepository } from '../infrastructure/in-memory-user.repository';
import { InMemoryUserIdentityRepository } from '../infrastructure/in-memory-user-identity.repository';
import { AuthProvider } from '../domain/auth-provider';
import { User } from '../domain/user';
import { UserId } from '../domain/user-id';
import { Email } from '../domain/email';
import { AccountLinkRequiresAuthError } from '../domain/account-link-requires-auth.error';
import { UnverifiedProviderEmailError } from '../domain/unverified-provider-email.error';
import type { TokenService, TokenPayload } from '../domain/ports/token.service';

class FakeTokenService implements TokenService {
  sign(payload: TokenPayload): string {
    return `token:${payload.sub}:${payload.email}:${payload.isAdmin}`;
  }
  verify(token: string): TokenPayload {
    const parts = token.split(':');
    return { sub: parts[1], email: parts[2], isAdmin: parts[3] === 'true' };
  }
}

const EXISTING_USER_ID = '33333333-3333-4333-8333-333333333333';

/** Creates a repo with a social-only user (no password). Used for Path-2 tests
 *  where linking is safe because the existing account has no password hash. */
async function buildRepoWithSocialUser(email: string, name = 'Existing User') {
  const userRepo = new InMemoryUserRepository();
  const user = User.create({
    id: UserId.fromString(EXISTING_USER_ID),
    email: Email.fromString(email),
    passwordHash: null, // social-only — safe to link a new identity
    name,
    isAdmin: false,
  });
  await userRepo.save(user);
  return userRepo;
}

/** Creates a repo with a password-based user (has passwordHash).
 *  Used for the account-hijack guard test. */
async function buildRepoWithPasswordUser(
  email: string,
  name = 'Password User',
) {
  const userRepo = new InMemoryUserRepository();
  const user = User.create({
    id: UserId.fromString(EXISTING_USER_ID),
    email: Email.fromString(email),
    passwordHash: 'hashed:somepass',
    name,
    isAdmin: false,
  });
  await userRepo.save(user);
  return userRepo;
}

describe('AuthenticateWithProvider', () => {
  const tokenService = new FakeTokenService();

  const cmd = {
    provider: AuthProvider.Google,
    providerUserId: 'google-uid-123',
    email: 'social@example.com',
    name: 'Social User',
    emailVerified: true,
  };

  describe('Path 1 — identity already linked', () => {
    it('returns a token for the existing user', async () => {
      const userRepo = await buildRepoWithSocialUser('social@example.com');
      const identityRepo = new InMemoryUserIdentityRepository();
      // pre-link the identity
      await identityRepo.link(UserId.fromString(EXISTING_USER_ID), {
        provider: AuthProvider.Google,
        providerUserId: 'google-uid-123',
      });

      const useCase = new AuthenticateWithProvider(
        userRepo,
        identityRepo,
        tokenService,
      );
      const result = await useCase.execute(cmd);

      expect(result.accessToken).toContain(EXISTING_USER_ID);
      expect(result.accessToken).toContain('social@example.com');
    });

    it('does not create a second user when identity is already linked', async () => {
      const userRepo = await buildRepoWithSocialUser('social@example.com');
      const identityRepo = new InMemoryUserIdentityRepository();
      await identityRepo.link(UserId.fromString(EXISTING_USER_ID), {
        provider: AuthProvider.Google,
        providerUserId: 'google-uid-123',
      });

      const useCase = new AuthenticateWithProvider(
        userRepo,
        identityRepo,
        tokenService,
      );
      await useCase.execute(cmd);
      // Only the original user should exist
      const found = await userRepo.findByEmail(
        Email.fromString('social@example.com'),
      );
      expect(found?.id.value).toBe(EXISTING_USER_ID);
    });
  });

  describe('Path 2 — email matches existing account (unify by email)', () => {
    it('links the new identity and returns a token for the existing user', async () => {
      const userRepo = await buildRepoWithSocialUser('social@example.com');
      const identityRepo = new InMemoryUserIdentityRepository();

      const useCase = new AuthenticateWithProvider(
        userRepo,
        identityRepo,
        tokenService,
      );
      const result = await useCase.execute(cmd);

      expect(result.accessToken).toContain(EXISTING_USER_ID);
    });

    it('stores the linked identity so Path 1 applies on next login', async () => {
      const userRepo = await buildRepoWithSocialUser('social@example.com');
      const identityRepo = new InMemoryUserIdentityRepository();

      const useCase = new AuthenticateWithProvider(
        userRepo,
        identityRepo,
        tokenService,
      );
      await useCase.execute(cmd);

      const linkedId = await identityRepo.findByProvider(
        AuthProvider.Google,
        'google-uid-123',
      );
      expect(linkedId?.value).toBe(EXISTING_USER_ID);
    });

    it('does not create a new user when email already exists', async () => {
      const userRepo = await buildRepoWithSocialUser('social@example.com');
      const identityRepo = new InMemoryUserIdentityRepository();
      const countBefore = await userRepo.countAll();

      const useCase = new AuthenticateWithProvider(
        userRepo,
        identityRepo,
        tokenService,
      );
      await useCase.execute(cmd);

      expect(await userRepo.countAll()).toBe(countBefore);
    });
  });

  describe('Path 3 — brand-new user', () => {
    it('creates the user and returns a token', async () => {
      const userRepo = new InMemoryUserRepository();
      const identityRepo = new InMemoryUserIdentityRepository();

      const useCase = new AuthenticateWithProvider(
        userRepo,
        identityRepo,
        tokenService,
      );
      const result = await useCase.execute(cmd);

      expect(result.accessToken).toContain('social@example.com');
    });

    it('saves the user with null passwordHash (social-only)', async () => {
      const userRepo = new InMemoryUserRepository();
      const identityRepo = new InMemoryUserIdentityRepository();

      const useCase = new AuthenticateWithProvider(
        userRepo,
        identityRepo,
        tokenService,
      );
      await useCase.execute(cmd);

      const found = await userRepo.findByEmail(
        Email.fromString('social@example.com'),
      );
      expect(found).not.toBeNull();
      expect(found?.passwordHash).toBeNull();
      expect(found?.name).toBe('Social User');
      expect(found?.isAdmin).toBe(false);
    });

    it('links the identity so future logins use Path 1', async () => {
      const userRepo = new InMemoryUserRepository();
      const identityRepo = new InMemoryUserIdentityRepository();

      const useCase = new AuthenticateWithProvider(
        userRepo,
        identityRepo,
        tokenService,
      );
      await useCase.execute(cmd);

      const linkedId = await identityRepo.findByProvider(
        AuthProvider.Google,
        'google-uid-123',
      );
      expect(linkedId).not.toBeNull();

      const user = await userRepo.findByEmail(
        Email.fromString('social@example.com'),
      );
      expect(linkedId?.value).toBe(user?.id.value);
    });

    it('Facebook provider also works', async () => {
      const userRepo = new InMemoryUserRepository();
      const identityRepo = new InMemoryUserIdentityRepository();

      const useCase = new AuthenticateWithProvider(
        userRepo,
        identityRepo,
        tokenService,
      );
      const result = await useCase.execute({
        provider: AuthProvider.Facebook,
        providerUserId: 'fb-uid-456',
        email: 'fb@example.com',
        name: 'FB User',
        emailVerified: true,
      });

      expect(result.accessToken).toContain('fb@example.com');
    });
  });

  describe('Security — account hijack prevention', () => {
    it('throws AccountLinkRequiresAuthError when social email matches a password-based account with no prior identity link', async () => {
      // An attacker controls a Google account with victim@example.com.
      // The victim already has a password account with that email.
      // Without the guard this would silently log the attacker in as the victim.
      const userRepo = await buildRepoWithPasswordUser('victim@example.com');
      const identityRepo = new InMemoryUserIdentityRepository();
      // No identity linked yet for this provider.

      const useCase = new AuthenticateWithProvider(
        userRepo,
        identityRepo,
        tokenService,
      );

      await expect(
        useCase.execute({
          provider: AuthProvider.Google,
          providerUserId: 'attacker-google-uid',
          email: 'victim@example.com',
          name: 'Attacker',
          emailVerified: true,
        }),
      ).rejects.toThrow(AccountLinkRequiresAuthError);
    });

    it('does NOT emit a token when account hijack is blocked', async () => {
      const userRepo = await buildRepoWithPasswordUser('victim@example.com');
      const identityRepo = new InMemoryUserIdentityRepository();

      const useCase = new AuthenticateWithProvider(
        userRepo,
        identityRepo,
        tokenService,
      );

      let token: string | undefined;
      try {
        ({ accessToken: token } = await useCase.execute({
          provider: AuthProvider.Google,
          providerUserId: 'attacker-google-uid',
          email: 'victim@example.com',
          name: 'Attacker',
          emailVerified: true,
        }));
      } catch {
        // expected
      }
      expect(token).toBeUndefined();
    });

    it('does NOT link the social identity when account hijack is blocked', async () => {
      const userRepo = await buildRepoWithPasswordUser('victim@example.com');
      const identityRepo = new InMemoryUserIdentityRepository();

      const useCase = new AuthenticateWithProvider(
        userRepo,
        identityRepo,
        tokenService,
      );

      try {
        await useCase.execute({
          provider: AuthProvider.Google,
          providerUserId: 'attacker-google-uid',
          email: 'victim@example.com',
          name: 'Attacker',
          emailVerified: true,
        });
      } catch {
        // expected
      }

      // The attacker's Google identity must NOT be linked to the victim's account
      const linkedId = await identityRepo.findByProvider(
        AuthProvider.Google,
        'attacker-google-uid',
      );
      expect(linkedId).toBeNull();
    });

    it('throws UnverifiedProviderEmailError when a social-only email is NOT provider-verified', async () => {
      // The victim signed up with Google (social-only) as victim@example.com.
      // An attacker logs in with a second provider claiming victim@example.com
      // WITHOUT the provider having verified it. Auto-linking must be refused.
      const userRepo = await buildRepoWithSocialUser('victim@example.com');
      const identityRepo = new InMemoryUserIdentityRepository();

      const useCase = new AuthenticateWithProvider(
        userRepo,
        identityRepo,
        tokenService,
      );

      await expect(
        useCase.execute({
          provider: AuthProvider.Facebook,
          providerUserId: 'attacker-fb-uid',
          email: 'victim@example.com',
          name: 'Attacker',
          emailVerified: false,
        }),
      ).rejects.toThrow(UnverifiedProviderEmailError);

      // No identity linked and no token issued.
      const linkedId = await identityRepo.findByProvider(
        AuthProvider.Facebook,
        'attacker-fb-uid',
      );
      expect(linkedId).toBeNull();
    });

    it('links a social-only account when the provider email IS verified (Path 2 happy path)', async () => {
      const userRepo = await buildRepoWithSocialUser('victim@example.com');
      const identityRepo = new InMemoryUserIdentityRepository();

      const useCase = new AuthenticateWithProvider(
        userRepo,
        identityRepo,
        tokenService,
      );

      const result = await useCase.execute({
        provider: AuthProvider.Facebook,
        providerUserId: 'owner-fb-uid',
        email: 'victim@example.com',
        name: 'Owner',
        emailVerified: true,
      });

      expect(result.accessToken).toContain(EXISTING_USER_ID);
      const linkedId = await identityRepo.findByProvider(
        AuthProvider.Facebook,
        'owner-fb-uid',
      );
      expect(linkedId?.value).toBe(EXISTING_USER_ID);
    });

    it('allows social login for a password account that already has an identity for that provider (Path 1)', async () => {
      // If the user themselves previously linked their Google account, Path 1
      // applies first and they should still be able to log in.
      const userRepo = await buildRepoWithPasswordUser('linked@example.com');
      const identityRepo = new InMemoryUserIdentityRepository();
      await identityRepo.link(UserId.fromString(EXISTING_USER_ID), {
        provider: AuthProvider.Google,
        providerUserId: 'user-own-google-uid',
      });

      const useCase = new AuthenticateWithProvider(
        userRepo,
        identityRepo,
        tokenService,
      );
      const result = await useCase.execute({
        provider: AuthProvider.Google,
        providerUserId: 'user-own-google-uid',
        email: 'linked@example.com',
        name: 'Linked User',
        emailVerified: true,
      });

      expect(result.accessToken).toContain(EXISTING_USER_ID);
    });
  });
});
