import { LoginByPhone } from './login-by-phone';
import { InMemoryUserRepository } from '../infrastructure/in-memory-user.repository';
import { User } from '../domain/user';
import { UserId } from '../domain/user-id';
import { Email } from '../domain/email';
import { UserNotFoundByPhoneError } from '../domain/user-not-found-by-phone.error';
import type { TokenService, TokenPayload } from '../domain/ports/token.service';

class FakeTokenService implements TokenService {
  sign(p: TokenPayload): string {
    return `token:${p.sub}:${p.email}:${p.isAdmin}`;
  }
  verify(): TokenPayload {
    throw new Error('not used');
  }
}

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

async function seed(
  repo: InMemoryUserRepository,
  u: {
    id: string;
    email: string;
    phone: string | null;
    isAdmin?: boolean;
    name?: string;
  },
): Promise<void> {
  await repo.save(
    User.create({
      id: UserId.fromString(u.id),
      email: Email.fromString(u.email),
      passwordHash: null,
      name: u.name ?? 'User',
      isAdmin: u.isAdmin ?? false,
      phone: u.phone,
    }),
  );
}

describe('LoginByPhone', () => {
  const tokenService = new FakeTokenService();

  it('issues a token for the user matching the phone, format-insensitively', async () => {
    const repo = new InMemoryUserRepository();
    await seed(repo, {
      id: A,
      email: 'ana@reliefhub.org',
      phone: '+58 412-555.0101',
      name: 'Ana',
    });

    const result = await new LoginByPhone(repo, tokenService).execute({
      phone: '+584125550101',
    });

    expect(result.user).toEqual({
      id: A,
      name: 'Ana',
      email: 'ana@reliefhub.org',
    });
    expect(result.accessToken).toContain('ana@reliefhub.org');
    expect(result.ambiguous).toBe(false);
  });

  it('propagates isAdmin into the token claims (no privilege escalation)', async () => {
    const repo = new InMemoryUserRepository();
    await seed(repo, {
      id: A,
      email: 'plain@reliefhub.org',
      phone: '0412 555 0101',
      isAdmin: false,
    });

    const result = await new LoginByPhone(repo, tokenService).execute({
      phone: '04125550101',
    });

    // The JWT carries the user's own isAdmin=false — the bot never elevates.
    expect(result.accessToken.endsWith(':false')).toBe(true);
  });

  it('throws UserNotFoundByPhoneError when no user matches (→ 404)', async () => {
    const repo = new InMemoryUserRepository();
    await seed(repo, {
      id: A,
      email: 'ana@reliefhub.org',
      phone: '+584125550101',
    });

    await expect(
      new LoginByPhone(repo, tokenService).execute({ phone: '+34600000000' }),
    ).rejects.toBeInstanceOf(UserNotFoundByPhoneError);
  });

  it('a phone with no digits never matches → not found', async () => {
    const repo = new InMemoryUserRepository();
    await seed(repo, {
      id: A,
      email: 'ana@reliefhub.org',
      phone: '+584125550101',
    });

    await expect(
      new LoginByPhone(repo, tokenService).execute({ phone: '   ' }),
    ).rejects.toBeInstanceOf(UserNotFoundByPhoneError);
  });

  it('picks the most recent and flags ambiguous when several accounts share the phone', async () => {
    const repo = new InMemoryUserRepository();
    // Both accounts carry the SAME number in different formats.
    await seed(repo, {
      id: A,
      email: 'old@reliefhub.org',
      phone: '+58 412 555 0101',
      name: 'Old',
    });
    await seed(repo, {
      id: B,
      email: 'new@reliefhub.org',
      phone: '(58) 412.555.0101',
      name: 'New',
    });

    const result = await new LoginByPhone(repo, tokenService).execute({
      phone: '+584125550101',
    });

    expect(result.user.id).toBe(B); // most recent
    expect(result.ambiguous).toBe(true);
  });
});
