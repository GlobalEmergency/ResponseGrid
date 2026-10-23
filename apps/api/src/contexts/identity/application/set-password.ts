import { UserRepository } from '../domain/ports/user.repository';
import { PasswordHasher } from '../domain/ports/password-hasher';
import { TokenService } from '../domain/ports/token.service';
import { PasswordSetupTokenRepository } from '../domain/ports/password-setup-token.repository';
import { hashSetupToken } from '../domain/password-setup-token-generator';
import { UserId } from '../domain/user-id';
import { InvalidPasswordSetupTokenError } from '../domain/invalid-password-setup-token.error';

export interface SetPasswordCommand {
  /** The raw token from the email link. */
  token: string;
  newPassword: string;
}

/**
 * Redeem a set-password token (#204): validate it, set the account's password,
 * and consume it (plus any siblings) so it cannot be replayed. Returns a JWT so
 * the person is logged straight in and lands on their donations.
 *
 * SECURITY: a missing / expired / already-used token all raise the SAME error —
 * the response never reveals which, so a token cannot be probed. The token is
 * looked up by its hash; the raw value is never stored.
 */
export class SetPassword {
  constructor(
    private readonly tokens: PasswordSetupTokenRepository,
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokenService: TokenService,
  ) {}

  async execute(cmd: SetPasswordCommand): Promise<{ accessToken: string }> {
    const now = new Date();
    const token = await this.tokens.findByHash(hashSetupToken(cmd.token));
    if (!token || !token.isUsable(now)) {
      throw new InvalidPasswordSetupTokenError();
    }

    const user = await this.users.findById(UserId.fromString(token.userId));
    if (!user) throw new InvalidPasswordSetupTokenError();

    const passwordHash = await this.hasher.hash(cmd.newPassword);
    await this.users.setPassword(user.id, passwordHash);

    // Consume the spent token AND invalidate every other outstanding invite for
    // this account in one shot: no link (this one or an earlier resend) survives.
    await this.tokens.markUsedForUser(user.id.value, now);

    const accessToken = this.tokenService.sign({
      sub: user.id.value,
      email: user.email.value,
      isAdmin: user.isAdmin,
    });
    return { accessToken };
  }
}
