import { RegisterUser } from './register-user';
import { InMemoryUserRepository } from '../infrastructure/in-memory-user.repository';
import { User } from '../domain/user';
import { UserId } from '../domain/user-id';
import { Email } from '../domain/email';
import { EmailAlreadyRegisteredError } from '../domain/email-already-registered.error';
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

  it('registers a new user and returns an accessToken (auto-login)', async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new RegisterUser(repo, hasher, tokenService);

    const result = await useCase.execute({
      email: 'new@reliefhub.org',
      password: 'password123',
      name: 'New User',
    });

    expect(result.accessToken).toBeTruthy();
    expect(result.accessToken).toContain('new@reliefhub.org');
    expect(result.accessToken).toContain('false'); // isAdmin=false
  });

  it('persists the new user so it can be found by email', async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new RegisterUser(repo, hasher, tokenService);

    await useCase.execute({
      email: 'saved@reliefhub.org',
      password: 'password123',
      name: 'Saved',
    });

    const found = await repo.findByEmail(
      Email.fromString('saved@reliefhub.org'),
    );
    expect(found).not.toBeNull();
    expect(found?.name).toBe('Saved');
    expect(found?.isAdmin).toBe(false);
  });

  it('throws EmailAlreadyRegisteredError if email is already taken', async () => {
    const repo = await buildRepoWithUser('existing@reliefhub.org');
    const useCase = new RegisterUser(repo, hasher, tokenService);

    await expect(
      useCase.execute({
        email: 'existing@reliefhub.org',
        password: 'other123',
        name: 'Other',
      }),
    ).rejects.toThrow(EmailAlreadyRegisteredError);
  });

  it('email matching is case-insensitive (normalised to lowercase)', async () => {
    const repo = await buildRepoWithUser('taken@reliefhub.org');
    const useCase = new RegisterUser(repo, hasher, tokenService);

    await expect(
      useCase.execute({
        email: 'TAKEN@RELIEFHUB.ORG',
        password: 'pw123456',
        name: 'Dup',
      }),
    ).rejects.toThrow(EmailAlreadyRegisteredError);
  });

  it('throws on malformed email (forwarded from Email VO)', async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new RegisterUser(repo, hasher, tokenService);

    await expect(
      useCase.execute({
        email: 'not-an-email',
        password: 'pw123456',
        name: 'Bad',
      }),
    ).rejects.toThrow();
  });

  it('stores the password hashed, never plain text', async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new RegisterUser(repo, hasher, tokenService);

    await useCase.execute({
      email: 'hash@reliefhub.org',
      password: 'mysecret',
      name: 'Hashed',
    });

    const found = await repo.findByEmail(
      Email.fromString('hash@reliefhub.org'),
    );
    expect(found?.passwordHash).not.toBe('mysecret');
    expect(found?.passwordHash).toBe('hashed:mysecret');
  });

  it('persiste el teléfono cuando se pasa en el registro', async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new RegisterUser(repo, hasher, tokenService);

    await useCase.execute({
      email: 'phone@reliefhub.org',
      password: 'password123',
      name: 'Phone User',
      phone: '+58 412 555 0101',
    });

    const found = await repo.findByEmail(
      Email.fromString('phone@reliefhub.org'),
    );
    expect(found?.phone).toBe('+58 412 555 0101');
  });

  it('phone es null cuando no se pasa en el registro', async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new RegisterUser(repo, hasher, tokenService);

    await useCase.execute({
      email: 'nophone@reliefhub.org',
      password: 'password123',
      name: 'No Phone',
    });

    const found = await repo.findByEmail(
      Email.fromString('nophone@reliefhub.org'),
    );
    expect(found?.phone).toBeNull();
  });
});
