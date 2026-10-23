import { UserRepository } from '../domain/ports/user.repository';
import { SetPasswordInviter } from '../domain/ports/set-password-inviter';
import { Email } from '../domain/email';

export interface RequestPasswordSetupCommand {
  email: string;
}

/**
 * Resend the "create your password" email for a passwordless profile (#204).
 *
 * SECURITY: account-enumeration safe — it returns nothing and the caller always
 * responds 202 regardless of outcome. An invite is only actually sent when the
 * email maps to an existing account that has NO password yet (a passwordless
 * donor profile). A malformed email, an unknown email, or an account that
 * already has a password are all silent no-ops, so the endpoint can't be used to
 * discover which emails exist or to spam a real user with reset links.
 */
export class RequestPasswordSetup {
  constructor(
    private readonly users: UserRepository,
    private readonly inviter: SetPasswordInviter,
  ) {}

  async execute(cmd: RequestPasswordSetupCommand): Promise<void> {
    let email: Email;
    try {
      email = Email.fromString(cmd.email);
    } catch {
      return;
    }

    const user = await this.users.findByEmail(email);
    if (!user || user.passwordHash !== null) return;

    await this.inviter.invite({
      userId: user.id.value,
      email: user.email.value,
      name: user.name,
    });
  }
}
