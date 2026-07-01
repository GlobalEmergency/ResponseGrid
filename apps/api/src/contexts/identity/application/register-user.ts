import { UserRepository } from '../domain/ports/user.repository';
import { PasswordHasher } from '../domain/ports/password-hasher';
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

export interface RegisterUserCommand {
  email: string;
  password: string;
  name: string;
  /** Contact phone — required for every account. */
  phone: string;
  /** Must be true — acceptance of the Terms of Service. */
  acceptedTerms: boolean;
  /** Must be true — acceptance of the Privacy Policy. */
  acceptedPrivacy: boolean;
  /** Request IP at acceptance (audit); optional. */
  ip?: string | null;
  /** Request User-Agent at acceptance (audit); optional. */
  userAgent?: string | null;
}

export class RegisterUser {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly consentRepo: ConsentRepository,
  ) {}

  async execute(cmd: RegisterUserCommand): Promise<{ accessToken: string }> {
    if (!cmd.acceptedTerms || !cmd.acceptedPrivacy) {
      throw new ConsentRequiredError();
    }
    const phone = cmd.phone?.trim() ?? '';
    if (phone === '') throw new PhoneRequiredError();

    const email = Email.fromString(cmd.email);

    const existing = await this.userRepo.findByEmail(email);
    if (existing) throw new EmailAlreadyRegisteredError();

    const passwordHash = await this.hasher.hash(cmd.password);
    const id = UserId.create();
    const user = User.create({
      id,
      email,
      passwordHash,
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
      { ip: cmd.ip ?? null, userAgent: cmd.userAgent ?? null },
    );

    const accessToken = this.tokenService.sign({
      sub: id.value,
      email: email.value,
      isAdmin: false,
    });

    return { accessToken };
  }
}
