import { UserRepository } from '../domain/ports/user.repository';
import { SetPasswordInviter } from '../domain/ports/set-password-inviter';
import { Email } from '../domain/email';
import { UserId } from '../domain/user-id';
import { User } from '../domain/user';

export interface EnsureDonorAccountCommand {
  email: string;
  name: string;
  phone: string | null;
}

export interface EnsureDonorAccountResult {
  userId: string;
  created: boolean;
}

/**
 * Find-or-create a platform profile for a donor by email (#168). If a user with
 * that email already exists, it is returned untouched. Otherwise a PASSWORDLESS
 * account is created (passwordHash null — it cannot log in by password until the
 * person sets one) carrying the donor's name and phone, and the set-password
 * invite seam fires. This lets a donation be linked to a real profile even when
 * the donor pre-registered without logging in.
 *
 * Throws if the email is malformed; callers that treat account-linking as
 * best-effort should guard the call so a bad email never fails the donation.
 */
export class EnsureDonorAccount {
  constructor(
    private readonly users: UserRepository,
    private readonly inviter: SetPasswordInviter,
  ) {}

  async execute(
    cmd: EnsureDonorAccountCommand,
  ): Promise<EnsureDonorAccountResult> {
    const email = Email.fromString(cmd.email);

    const existing = await this.users.findByEmail(email);
    if (existing) return { userId: existing.id.value, created: false };

    const id = UserId.create();
    const user = User.create({
      id,
      email,
      passwordHash: null,
      name: cmd.name,
      isAdmin: false,
      phone: cmd.phone,
    });
    await this.users.save(user);

    await this.inviter.invite({
      userId: id.value,
      email: email.value,
      name: cmd.name,
    });

    return { userId: id.value, created: true };
  }
}
