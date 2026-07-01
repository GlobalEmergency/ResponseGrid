import { RegisterUser, type RegisterUserCommand } from './register-user';
import { InMemoryUserRepository } from '../infrastructure/in-memory-user.repository';
import { InMemoryConsentRepository } from '../infrastructure/in-memory-consent.repository';
import { User } from '../domain/user';
import { UserId } from '../domain/user-id';
import { Email } from '../domain/email';
import { EmailAlreadyRegisteredError } from '../domain/email-already-registered.error';
import { ConsentRequiredError } from '../domain/consent-required.error';
import { PhoneRequiredError } from '../domain/phone-required.error';
import { ConsentDocument, CURRENT_CONSENT_VERSIONS } from '../domain/consent';
import type { PasswordHasher } from '../domain/ports/password-hasher';
import type { TokenService, TokenPayload } from '../domain/ports/token.service';

class FakePasswordHasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    return Promise.resolve(`hashed:${plain}`);
  }
  compare(plain: string, hash: string): Promise<boolean> {
    return Promise.resolve(hash === `hashed:${plain}`);
  }
}

class FakeTokenService implements TokenService {
  sign(payload: TokenPayload): string {
    return `token:${payload.sub}:${payload.email}:${payload.isAdmin}`;
  }
  verify(token: string): TokenPayload {
    const [, sub, email, isAdmin] = token.split(':');
    return { sub, email, isAdmin: isAdmin === 'true' };
  }
}

const EXISTING_USER_ID = '22222222-2222-4222-8222-222222222222';

/** A valid registration command with consent accepted and a phone supplied. */
function validCmd(
  overrides: Partial<RegisterUserCommand> = {},
): RegisterUserCommand {
  return {
    email: 'new@reliefhub.org',
    password: 'password123',
    name: 'New User',
    phone: '+58 412 555 0101',
    acceptedTerms: true,
    acceptedPrivacy: true,
    ...overrides,
  };
}

async function buildRepoWithUser(
  email: string,
): Promise<InMemoryUserRepository> {
  const repo = new InMemoryUserRepository();
  const hasher = new FakePasswordHasher();
  const user = User.create({
    id: UserId.fromString(EXISTING_USER_ID),
    email: Email.fromString(email),
    passwordHash: await hasher.hash('somepass'),
    name: 'Existing User',
    isAdmin: false,
  });
  await repo.save(user);
  return repo;
}

describe('RegisterUser', () => {
  const hasher = new FakePasswordHasher();
  const tokenService = new FakeTokenService();

  function useCaseWith(repo: InMemoryUserRepository) {
    const consentRepo = new InMemoryConsentRepository();
    return {
      useCase: new RegisterUser(repo, hasher, tokenService, consentRepo),
      consentRepo,
    };
  }

  it('registers a new user and returns an accessToken (auto-login)', async () => {
    const repo = new InMemoryUserRepository();
    const { useCase } = useCaseWith(repo);

    const result = await useCase.execute(validCmd());

    expect(result.accessToken).toBeTruthy();
    expect(result.accessToken).toContain('new@reliefhub.org');
    expect(result.accessToken).toContain('false'); // isAdmin=false
  });

  it('persists the new user so it can be found by email', async () => {
    const repo = new InMemoryUserRepository();
    const { useCase } = useCaseWith(repo);

    await useCase.execute(
      validCmd({ email: 'saved@reliefhub.org', name: 'Saved' }),
    );

    const found = await repo.findByEmail(
      Email.fromString('saved@reliefhub.org'),
    );
    expect(found).not.toBeNull();
    expect(found?.name).toBe('Saved');
    expect(found?.isAdmin).toBe(false);
  });

  it('throws EmailAlreadyRegisteredError if email is already taken', async () => {
    const repo = await buildRepoWithUser('existing@reliefhub.org');
    const { useCase } = useCaseWith(repo);

    await expect(
      useCase.execute(validCmd({ email: 'existing@reliefhub.org' })),
    ).rejects.toThrow(EmailAlreadyRegisteredError);
  });

  it('email matching is case-insensitive (normalised to lowercase)', async () => {
    const repo = await buildRepoWithUser('taken@reliefhub.org');
    const { useCase } = useCaseWith(repo);

    await expect(
      useCase.execute(validCmd({ email: 'TAKEN@RELIEFHUB.ORG' })),
    ).rejects.toThrow(EmailAlreadyRegisteredError);
  });

  it('throws on malformed email (forwarded from Email VO)', async () => {
    const repo = new InMemoryUserRepository();
    const { useCase } = useCaseWith(repo);

    await expect(
      useCase.execute(validCmd({ email: 'not-an-email' })),
    ).rejects.toThrow();
  });

  it('stores the password hashed, never plain text', async () => {
    const repo = new InMemoryUserRepository();
    const { useCase } = useCaseWith(repo);

    await useCase.execute(
      validCmd({ email: 'hash@reliefhub.org', password: 'mysecret' }),
    );

    const found = await repo.findByEmail(
      Email.fromString('hash@reliefhub.org'),
    );
    expect(found?.passwordHash).not.toBe('mysecret');
    expect(found?.passwordHash).toBe('hashed:mysecret');
  });

  it('persiste el teléfono del registro', async () => {
    const repo = new InMemoryUserRepository();
    const { useCase } = useCaseWith(repo);

    await useCase.execute(
      validCmd({ email: 'phone@reliefhub.org', phone: '+58 412 555 0101' }),
    );

    const found = await repo.findByEmail(
      Email.fromString('phone@reliefhub.org'),
    );
    expect(found?.phone).toBe('+58 412 555 0101');
  });

  it('graba el consentimiento de términos y privacidad en la versión actual', async () => {
    const repo = new InMemoryUserRepository();
    const { useCase, consentRepo } = useCaseWith(repo);

    await useCase.execute(
      validCmd({
        email: 'consent@reliefhub.org',
        ip: '203.0.113.7',
        userAgent: 'jest-agent/1.0',
      }),
    );

    const saved = await repo.findByEmail(
      Email.fromString('consent@reliefhub.org'),
    );
    const consents = await consentRepo.findByUser(saved!.id);
    expect(consents).toHaveLength(2);
    const terms = consents.find((c) => c.document === ConsentDocument.Terms);
    const privacy = consents.find(
      (c) => c.document === ConsentDocument.Privacy,
    );
    expect(terms?.version).toBe(
      CURRENT_CONSENT_VERSIONS[ConsentDocument.Terms],
    );
    expect(privacy?.version).toBe(
      CURRENT_CONSENT_VERSIONS[ConsentDocument.Privacy],
    );
    expect(terms?.acceptedAt).toBeInstanceOf(Date);
    // Audit metadata is captured on every acceptance row.
    expect(terms?.ip).toBe('203.0.113.7');
    expect(terms?.userAgent).toBe('jest-agent/1.0');
    expect(privacy?.ip).toBe('203.0.113.7');
  });

  it('rechaza el registro si no acepta los términos', async () => {
    const repo = new InMemoryUserRepository();
    const { useCase } = useCaseWith(repo);

    await expect(
      useCase.execute(validCmd({ acceptedTerms: false })),
    ).rejects.toThrow(ConsentRequiredError);
    expect(await repo.countAll()).toBe(0);
  });

  it('rechaza el registro si no acepta la política de privacidad', async () => {
    const repo = new InMemoryUserRepository();
    const { useCase } = useCaseWith(repo);

    await expect(
      useCase.execute(validCmd({ acceptedPrivacy: false })),
    ).rejects.toThrow(ConsentRequiredError);
    expect(await repo.countAll()).toBe(0);
  });

  it('rechaza el registro si no hay teléfono', async () => {
    const repo = new InMemoryUserRepository();
    const { useCase } = useCaseWith(repo);

    await expect(useCase.execute(validCmd({ phone: '   ' }))).rejects.toThrow(
      PhoneRequiredError,
    );
    expect(await repo.countAll()).toBe(0);
  });
});
