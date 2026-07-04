import {
  RegisterByPhone,
  type RegisterByPhoneCommand,
} from './register-by-phone';
import { InMemoryUserRepository } from '../infrastructure/in-memory-user.repository';
import { InMemoryConsentRepository } from '../infrastructure/in-memory-consent.repository';
import { User } from '../domain/user';
import { UserId } from '../domain/user-id';
import { Email } from '../domain/email';
import { EmailAlreadyRegisteredError } from '../domain/email-already-registered.error';
import { ConsentRequiredError } from '../domain/consent-required.error';
import { PhoneRequiredError } from '../domain/phone-required.error';
import type { TokenService, TokenPayload } from '../domain/ports/token.service';

class FakeTokenService implements TokenService {
  sign(p: TokenPayload): string {
    return `token:${p.sub}:${p.email}:${p.isAdmin}`;
  }
  verify(): TokenPayload {
    throw new Error('not used');
  }
}

const SA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function validCmd(
  overrides: Partial<RegisterByPhoneCommand> = {},
): RegisterByPhoneCommand {
  return {
    phone: '+58 412 555 0101',
    name: 'Nueva Persona',
    email: 'nueva@reliefhub.org',
    acceptedTerms: true,
    acceptedPrivacy: true,
    serviceAccountId: SA,
    ...overrides,
  };
}

function makeUseCase(repo: InMemoryUserRepository) {
  const consentRepo = new InMemoryConsentRepository();
  return {
    useCase: new RegisterByPhone(repo, new FakeTokenService(), consentRepo),
    consentRepo,
  };
}

describe('RegisterByPhone', () => {
  it('creates a passwordless account with the phone and returns a token', async () => {
    const repo = new InMemoryUserRepository();
    const { useCase } = makeUseCase(repo);

    const result = await useCase.execute(validCmd());

    expect(result.user).toMatchObject({
      name: 'Nueva Persona',
      email: 'nueva@reliefhub.org',
    });
    expect(result.accessToken).toContain('nueva@reliefhub.org');
    expect(result.ambiguous).toBe(false);

    const saved = await repo.findByEmail(
      Email.fromString('nueva@reliefhub.org'),
    );
    expect(saved).not.toBeNull();
    expect(saved!.passwordHash).toBeNull(); // social/bot alta path
    expect(saved!.phone).toBe('+58 412 555 0101');
    expect(saved!.isAdmin).toBe(false);
  });

  it('records consent for both legal documents', async () => {
    const repo = new InMemoryUserRepository();
    const { useCase, consentRepo } = makeUseCase(repo);

    await useCase.execute(validCmd({ email: 'consent@reliefhub.org' }));

    const saved = await repo.findByEmail(
      Email.fromString('consent@reliefhub.org'),
    );
    const consents = await consentRepo.findByUser(saved!.id);
    expect(consents).toHaveLength(2);
  });

  it('409 (EmailAlreadyRegisteredError) when the email already exists', async () => {
    const repo = new InMemoryUserRepository();
    await repo.save(
      User.create({
        id: UserId.fromString('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
        email: Email.fromString('taken@reliefhub.org'),
        passwordHash: 'x',
        name: 'Existing',
        isAdmin: false,
      }),
    );
    const { useCase } = makeUseCase(repo);

    await expect(
      useCase.execute(validCmd({ email: 'taken@reliefhub.org' })),
    ).rejects.toBeInstanceOf(EmailAlreadyRegisteredError);
  });

  it('400 (ConsentRequiredError) when terms or privacy are not accepted', async () => {
    const repo = new InMemoryUserRepository();
    const { useCase } = makeUseCase(repo);

    await expect(
      useCase.execute(validCmd({ acceptedTerms: false })),
    ).rejects.toBeInstanceOf(ConsentRequiredError);
    await expect(
      useCase.execute(validCmd({ acceptedPrivacy: false })),
    ).rejects.toBeInstanceOf(ConsentRequiredError);
    expect(await repo.countAll()).toBe(0);
  });

  it('400 (PhoneRequiredError) when the phone is blank', async () => {
    const repo = new InMemoryUserRepository();
    const { useCase } = makeUseCase(repo);

    await expect(
      useCase.execute(validCmd({ phone: '   ' })),
    ).rejects.toBeInstanceOf(PhoneRequiredError);
    expect(await repo.countAll()).toBe(0);
  });
});
