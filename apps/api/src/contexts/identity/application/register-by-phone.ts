import { UserRepository } from '../domain/ports/user.repository';
import { TokenService } from '../domain/ports/token.service';
import { ConsentRepository } from '../domain/ports/consent.repository';
import { Email } from '../domain/email';
import { UserId } from '../domain/user-id';
import { User } from '../domain/user';
import { EmailAlreadyRegisteredError } from '../domain/email-already-registered.error';
import { ConsentRequiredError } from '../domain/consent-required.error';
import { PhoneRequiredError } from '../domain/phone-required.error';
import {
  ALL_CONSENT_DOCUMENTS,
  CURRENT_CONSENT_VERSIONS,
} from '../domain/consent';
import { TrustedAuthResult } from './login-by-phone';

export interface RegisterByPhoneCommand {
  /** The verified phone number shared on the channel (the account's contact). */
  phone: string;
  name: string;
  email: string;
  /** Must be true — the bot showed the Terms and collected acceptance. */
  acceptedTerms: boolean;
  /** Must be true — the bot showed the Privacy Policy and collected acceptance. */
  acceptedPrivacy: boolean;
  /** The service account (bot) recording this alta, stamped on the consent. */
  serviceAccountId: string;
}

/**
 * Creates a passwordless account for a phone verified by a trusted channel, when
 * `login-by-phone` found no existing user (the bot then collected name + email +
 * consent in the conversation). Mirrors the social-login alta path: the user has
 * `passwordHash: null` and must set a password via the normal reset flow to log
 * in on the web. Consent is recorded stamped with the originating service
 * account instead of an IP/User-Agent (#315).
 */
export class RegisterByPhone {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly tokenService: TokenService,
    private readonly consentRepo: ConsentRepository,
  ) {}

  async execute(cmd: RegisterByPhoneCommand): Promise<TrustedAuthResult> {
    if (!cmd.acceptedTerms || !cmd.acceptedPrivacy) {
      throw new ConsentRequiredError();
    }
    const phone = cmd.phone?.trim() ?? '';
    if (phone === '') throw new PhoneRequiredError();

    const email = Email.fromString(cmd.email);

    const existing = await this.userRepo.findByEmail(email);
    if (existing) throw new EmailAlreadyRegisteredError();

    const id = UserId.create();
    const user = User.create({
      id,
      email,
      passwordHash: null,
      name: cmd.name,
      isAdmin: false,
      phone,
    });
    await this.userRepo.save(user);

    await this.consentRepo.record(
      id,
      ALL_CONSENT_DOCUMENTS.map((document) => ({
        document,
        version: CURRENT_CONSENT_VERSIONS[document],
      })),
      { ip: null, userAgent: null, serviceAccountId: cmd.serviceAccountId },
    );

    const accessToken = this.tokenService.sign({
      sub: id.value,
      email: email.value,
      isAdmin: false,
    });

    return {
      accessToken,
      user: { id: id.value, name: cmd.name, email: email.value },
      ambiguous: false,
    };
  }
}
