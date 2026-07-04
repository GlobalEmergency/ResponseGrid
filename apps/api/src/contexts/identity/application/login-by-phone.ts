import { UserRepository } from '../domain/ports/user.repository';
import { TokenService } from '../domain/ports/token.service';
import { UserNotFoundByPhoneError } from '../domain/user-not-found-by-phone.error';

export interface LoginByPhoneCommand {
  /** The verified phone number the trusted channel (bot) shared. */
  phone: string;
}

/** The public identity the trusted endpoints hand back with the token. */
export interface TrustedAuthUser {
  id: string;
  name: string;
  email: string;
}

export interface TrustedAuthResult {
  accessToken: string;
  user: TrustedAuthUser;
  /**
   * True when more than one account matched the phone (historical duplicates,
   * no unique index on `phone`). The most recent was picked; the caller audits
   * the ambiguity for manual review (#315). Never a 500, never a silent guess.
   */
  ambiguous: boolean;
}

/**
 * Issues a user JWT from a phone number verified by a trusted messaging channel
 * (Telegram/WhatsApp bot). Called ONLY behind the `auth:trusted_phone_login`
 * service-account gate — this use case assumes the caller was already
 * authorised. The emitted token follows the normal rules (same claims as
 * `/auth/login`): it never confers more than the found user's own permissions,
 * so a leak of the bot's API key means "log in as any user who shared their
 * phone", not "act with any privilege" (#315).
 */
export class LoginByPhone {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly tokenService: TokenService,
  ) {}

  async execute(cmd: LoginByPhoneCommand): Promise<TrustedAuthResult> {
    const matches = await this.userRepo.findByPhone(cmd.phone);
    if (matches.length === 0) {
      throw new UserNotFoundByPhoneError();
    }

    // findByPhone returns most-recent-first; take the newest match.
    const user = matches[0];
    const accessToken = this.tokenService.sign({
      sub: user.id.value,
      email: user.email.value,
      isAdmin: user.isAdmin,
    });

    return {
      accessToken,
      user: { id: user.id.value, name: user.name, email: user.email.value },
      ambiguous: matches.length > 1,
    };
  }
}
