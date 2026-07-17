import { SetPassword } from './set-password';
import { InMemoryUserRepository } from '../infrastructure/in-memory-user.repository';
import { InMemoryPasswordSetupTokenRepository } from '../infrastructure/in-memory-password-setup-token.repository';
import { PasswordHasher } from '../domain/ports/password-hasher';
import { TokenService, TokenPayload } from '../domain/ports/token.service';
import { PasswordSetupToken } from '../domain/password-setup-token';
import {
  generateSetupToken,
  hashSetupToken,
} from '../domain/password-setup-token-generator';
import { User } from '../domain/user';
import { UserId } from '../domain/user-id';
import { Email } from '../domain/email';
import { InvalidPasswordSetupTokenError } from '../domain/invalid-password-setup-token.error';

class FakeHasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    return Promise.resolve(`hashed:${plain}`);
  }
  compare(plain: string, hash: string): Promise<boolean> {
    return Promise.resolve(hash === `hashed:${plain}`);
  }
}

class FakeTokenService implements TokenService {
  sign(payload: TokenPayload): string {
    return `jwt:${payload.sub}`;
  }
  verify(): TokenPayload {
    throw new Error('not used');
  }
}

const USER_ID = '22222222-2222-4222-8222-222222222222';

describe('SetPassword', () => {
  let users: InMemoryUserRepository;
  let tokens: InMemoryPasswordSetupTokenRepository;
  let setPassword: SetPassword;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    tokens = new InMemoryPasswordSetupTokenRepository();
    setPassword = new SetPassword(
      tokens,
      users,
      new FakeHasher(),
      new FakeTokenService(),
    );
    await users.save(
      User.create({
        id: UserId.fromString(USER_ID),
        email: Email.fromString('donor@example.com'),
        passwordHash: null,
        name: 'Donante',
        isAdmin: false,
      }),
    );
  });

  async function issueToken(overrides?: {
    plaintext?: string;
    expiresAt?: Date;
    used?: boolean;
  }): Promise<string> {
    const { plaintext, hash } = overrides?.plaintext
      ? {
          plaintext: overrides.plaintext,
          hash: hashSetupToken(overrides.plaintext),
        }
      : generateSetupToken();
    let token = PasswordSetupToken.issue({
      id: '11111111-1111-4111-8111-111111111111',
      userId: USER_ID,
      tokenHash: hash,
      expiresAt: overrides?.expiresAt ?? new Date(Date.now() + 3_600_000),
    });
    if (overrides?.used) token = token.markUsed(new Date());
    await tokens.save(token);
    return plaintext;
  }

  it('sets the password with a valid token and returns a JWT', async () => {
    const plaintext = await issueToken();

    const res = await setPassword.execute({
      token: plaintext,
      newPassword: 'my-new-pass',
    });

    expect(res.accessToken).toBe(`jwt:${USER_ID}`);
    const user = await users.findById(UserId.fromString(USER_ID));
    expect(user!.passwordHash).toBe('hashed:my-new-pass');
  });

  it('invalidates the token after use (no replay)', async () => {
    const plaintext = await issueToken();
    await setPassword.execute({ token: plaintext, newPassword: 'first-pass' });

    await expect(
      setPassword.execute({ token: plaintext, newPassword: 'second-pass' }),
    ).rejects.toBeInstanceOf(InvalidPasswordSetupTokenError);
  });

  it('rejects an expired token', async () => {
    const plaintext = await issueToken({
      expiresAt: new Date(Date.now() - 1_000),
    });
    await expect(
      setPassword.execute({ token: plaintext, newPassword: 'x' }),
    ).rejects.toBeInstanceOf(InvalidPasswordSetupTokenError);
  });

  it('rejects an already-used token', async () => {
    const plaintext = await issueToken({ used: true });
    await expect(
      setPassword.execute({ token: plaintext, newPassword: 'x' }),
    ).rejects.toBeInstanceOf(InvalidPasswordSetupTokenError);
  });

  it('rejects an unknown token', async () => {
    await expect(
      setPassword.execute({ token: 'not-a-real-token', newPassword: 'x' }),
    ).rejects.toBeInstanceOf(InvalidPasswordSetupTokenError);
  });
});
