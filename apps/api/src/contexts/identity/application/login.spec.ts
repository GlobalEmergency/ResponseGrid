import { Login } from './login';
import { InMemoryUserRepository } from '../infrastructure/in-memory-user.repository';
import { User } from '../domain/user';
import { UserId } from '../domain/user-id';
import { Email } from '../domain/email';
import { InvalidCredentialsError } from '../domain/invalid-credentials.error';
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

const USER_ID = '11111111-1111-4111-8111-111111111111';

async function buildRepo(email: string, password: string, isAdmin = false) {
  const repo = new InMemoryUserRepository();
  const hasher = new FakePasswordHasher();
  const user = User.create({
    id: UserId.fromString(USER_ID),
    email: Email.fromString(email),
    passwordHash: await hasher.hash(password),
    name: 'Test User',
    isAdmin,
  });
  await repo.save(user);
  return repo;
}

describe('Login', () => {
  const hasher = new FakePasswordHasher();
  const tokenService = new FakeTokenService();

  it('returns an accessToken for valid credentials', async () => {
    const repo = await buildRepo('admin@reliefhub.org', 'admin1234', true);
    const login = new Login(repo, hasher, tokenService);
    const result = await login.execute({
      email: 'admin@reliefhub.org',
      password: 'admin1234',
    });
    expect(result.accessToken).toContain(USER_ID);
    expect(result.accessToken).toContain('admin@reliefhub.org');
    expect(result.accessToken).toContain('true');
  });

  it('records the last login on success (issue #176)', async () => {
    const repo = await buildRepo('admin@reliefhub.org', 'admin1234', true);
    const login = new Login(repo, hasher, tokenService);
    await login.execute({
      email: 'admin@reliefhub.org',
      password: 'admin1234',
    });
    expect(repo.lastLoginOf(UserId.fromString(USER_ID))).toBeInstanceOf(Date);
  });

  it('does not record a login on invalid credentials', async () => {
    const repo = await buildRepo('admin@reliefhub.org', 'admin1234', true);
    const login = new Login(repo, hasher, tokenService);
    await expect(
      login.execute({ email: 'admin@reliefhub.org', password: 'wrong' }),
    ).rejects.toThrow(InvalidCredentialsError);
    expect(repo.lastLoginOf(UserId.fromString(USER_ID))).toBeUndefined();
  });

  it('throws InvalidCredentialsError for unknown email', async () => {
    const repo = new InMemoryUserRepository(); // empty
    const login = new Login(repo, hasher, tokenService);
    await expect(
      login.execute({ email: 'unknown@example.com', password: 'pass' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('throws InvalidCredentialsError for wrong password', async () => {
    const repo = await buildRepo('admin@reliefhub.org', 'admin1234');
    const login = new Login(repo, hasher, tokenService);
    await expect(
      login.execute({ email: 'admin@reliefhub.org', password: 'wrong' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('throws InvalidCredentialsError for malformed email', async () => {
    const repo = new InMemoryUserRepository();
    const login = new Login(repo, hasher, tokenService);
    await expect(
      login.execute({ email: 'not-an-email', password: 'pass' }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it('email comparison is case-insensitive (normalised to lowercase)', async () => {
    const repo = await buildRepo('admin@reliefhub.org', 'admin1234');
    const login = new Login(repo, hasher, tokenService);
    // email sent uppercased
    const result = await login.execute({
      email: 'ADMIN@RELIEFHUB.ORG',
      password: 'admin1234',
    });
    expect(result.accessToken).toBeTruthy();
  });
});
