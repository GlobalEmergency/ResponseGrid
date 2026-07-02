import { UserRepository } from '../domain/ports/user.repository';
import { PasswordHasher } from '../domain/ports/password-hasher';
import { TokenService } from '../domain/ports/token.service';
import { Email } from '../domain/email';
import { InvalidCredentialsError } from '../domain/invalid-credentials.error';

export interface LoginCommand {
  email: string;
  password: string;
}

/**
 * A syntactically valid bcrypt hash (cost 12) that no real password produces.
 * Used to spend a comparable amount of CPU on the "user missing" / "social-only
 * account" paths so that login response time does not leak whether an email is
 * registered with a password (user-enumeration timing side-channel).
 */
const DUMMY_PASSWORD_HASH =
  '$2b$12$d3A2Aawyuk7gBC5LgF1WpObQlzEgXstlefw5U.8kYOzYUU0kiaCEy';

export class Login {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokenService: TokenService,
  ) {}

  async execute(cmd: LoginCommand): Promise<{ accessToken: string }> {
    let email: Email;
    try {
      email = Email.fromString(cmd.email);
    } catch {
      throw new InvalidCredentialsError();
    }

    const user = await this.userRepo.findByEmail(email);

    // SECURITY: always run a bcrypt comparison, even when the account does not
    // exist or is social-only (no password). Returning early would make those
    // paths measurably faster than a real password check, letting an attacker
    // enumerate registered accounts by timing. We compare against a dummy hash
    // to keep the timing profile uniform before returning the generic error.
    const hashToCompare = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const valid = await this.hasher.compare(cmd.password, hashToCompare);

    if (!user || user.passwordHash === null || !valid) {
      throw new InvalidCredentialsError();
    }

    // Stamp last login for the admin users console (#176). Best-effort: a write
    // failure here must not deny an otherwise-valid login.
    await this.userRepo.recordLogin(user.id, new Date());

    const accessToken = this.tokenService.sign({
      sub: user.id.value,
      email: user.email.value,
      isAdmin: user.isAdmin,
    });

    return { accessToken };
  }
}
