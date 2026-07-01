import {
  CompleteRegistration,
  type CompleteRegistrationCommand,
} from './complete-registration';
import { InMemoryUserRepository } from '../infrastructure/in-memory-user.repository';
import { InMemoryConsentRepository } from '../infrastructure/in-memory-consent.repository';
import { User } from '../domain/user';
import { UserId } from '../domain/user-id';
import { Email } from '../domain/email';
import { ConsentRequiredError } from '../domain/consent-required.error';
import { PhoneRequiredError } from '../domain/phone-required.error';
import { UserNotFoundError } from '../domain/user-not-found.error';
import {
  ConsentDocument,
  CURRENT_CONSENT_VERSIONS,
  isProfileComplete,
} from '../domain/consent';

const SOCIAL_USER_ID = '44444444-4444-4444-8444-444444444444';

async function buildSocialUser(): Promise<InMemoryUserRepository> {
  const repo = new InMemoryUserRepository();
  await repo.save(
    User.create({
      id: UserId.fromString(SOCIAL_USER_ID),
      email: Email.fromString('social@example.com'),
      passwordHash: null,
      name: 'Social User',
      isAdmin: false,
      // no phone — social account is incomplete until onboarding
    }),
  );
  return repo;
}

function validCmd(
  overrides: Partial<CompleteRegistrationCommand> = {},
): CompleteRegistrationCommand {
  return {
    userId: SOCIAL_USER_ID,
    phone: '+58 412 555 0101',
    acceptedTerms: true,
    acceptedPrivacy: true,
    ...overrides,
  };
}

describe('CompleteRegistration', () => {
  it('sets the phone and records both consents, completing the profile', async () => {
    const repo = await buildSocialUser();
    const consentRepo = new InMemoryConsentRepository();
    const useCase = new CompleteRegistration(repo, consentRepo);

    const result = await useCase.execute(
      validCmd({ ip: '198.51.100.9', userAgent: 'jest-agent/2.0' }),
    );

    expect(result.profileComplete).toBe(true);
    const user = await repo.findById(UserId.fromString(SOCIAL_USER_ID));
    expect(user?.phone).toBe('+58 412 555 0101');
    const consents = await consentRepo.findByUser(
      UserId.fromString(SOCIAL_USER_ID),
    );
    expect(consents).toHaveLength(2);
    expect(isProfileComplete(user!.phone, consents)).toBe(true);
    const terms = consents.find((c) => c.document === ConsentDocument.Terms);
    expect(terms?.version).toBe(
      CURRENT_CONSENT_VERSIONS[ConsentDocument.Terms],
    );
    expect(terms?.ip).toBe('198.51.100.9');
    expect(terms?.userAgent).toBe('jest-agent/2.0');
  });

  it('does not duplicate consent rows when run twice', async () => {
    const repo = await buildSocialUser();
    const consentRepo = new InMemoryConsentRepository();
    const useCase = new CompleteRegistration(repo, consentRepo);

    await useCase.execute(validCmd());
    await useCase.execute(validCmd({ phone: '+58 412 555 9999' }));

    const consents = await consentRepo.findByUser(
      UserId.fromString(SOCIAL_USER_ID),
    );
    expect(consents).toHaveLength(2);
  });

  it('rejects when terms not accepted', async () => {
    const repo = await buildSocialUser();
    const useCase = new CompleteRegistration(
      repo,
      new InMemoryConsentRepository(),
    );

    await expect(
      useCase.execute(validCmd({ acceptedTerms: false })),
    ).rejects.toThrow(ConsentRequiredError);
  });

  it('rejects when privacy not accepted', async () => {
    const repo = await buildSocialUser();
    const useCase = new CompleteRegistration(
      repo,
      new InMemoryConsentRepository(),
    );

    await expect(
      useCase.execute(validCmd({ acceptedPrivacy: false })),
    ).rejects.toThrow(ConsentRequiredError);
  });

  it('rejects when phone is blank', async () => {
    const repo = await buildSocialUser();
    const useCase = new CompleteRegistration(
      repo,
      new InMemoryConsentRepository(),
    );

    await expect(useCase.execute(validCmd({ phone: '  ' }))).rejects.toThrow(
      PhoneRequiredError,
    );
  });

  it('throws when the user does not exist', async () => {
    const repo = new InMemoryUserRepository();
    const useCase = new CompleteRegistration(
      repo,
      new InMemoryConsentRepository(),
    );

    await expect(useCase.execute(validCmd())).rejects.toThrow(
      UserNotFoundError,
    );
  });
});
