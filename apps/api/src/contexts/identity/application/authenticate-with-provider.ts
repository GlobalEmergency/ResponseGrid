import { UserRepository } from '../domain/ports/user.repository';
import { UserIdentityRepository } from '../domain/ports/user-identity.repository';
import { TokenService } from '../domain/ports/token.service';
import { AuthProvider } from '../domain/auth-provider';
import { UserIdentity } from '../domain/user-identity';
import { User } from '../domain/user';
import { UserId } from '../domain/user-id';
import { Email } from '../domain/email';
import { AccountLinkRequiresAuthError } from '../domain/account-link-requires-auth.error';

export interface AuthenticateWithProviderCommand {
  provider: AuthProvider;
  providerUserId: string;
  email: string;
  name: string;
}

/**
 * Authenticates (or registers) a user via a social OAuth provider.
 *
 * Three paths:
 * 1. Identity already linked → load that user, emit token.
 * 2. Email matches existing account → link new identity, emit token.
 * 3. No match at all → create new user (no password), link identity, emit token.
 */
export class AuthenticateWithProvider {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly identityRepo: UserIdentityRepository,
    private readonly tokenService: TokenService,
  ) {}

  async execute(
    cmd: AuthenticateWithProviderCommand,
  ): Promise<{ accessToken: string }> {
    const identity = UserIdentity.create({
      provider: cmd.provider,
      providerUserId: cmd.providerUserId,
    });

    // Path 1 — identity already known
    const existingUserId = await this.identityRepo.findByProvider(
      cmd.provider,
      cmd.providerUserId,
    );
    if (existingUserId !== null) {
      const user = await this.userRepo.findById(existingUserId);
      if (user === null) {
        // Inconsistent state — should not happen in practice
        throw new Error(
          `User not found for linked identity: ${existingUserId.value}`,
        );
      }
      return { accessToken: this.tokenService.sign(this.payload(user)) };
    }

    // Path 2 — email matches an existing account
    // SECURITY: if the existing account has a password hash, auto-linking would
    // allow an attacker who controls a social account with the victim's email to
    // silently take over the victim's password account. We block this case and
    // require the user to authenticate with their password first, then link
    // the social identity explicitly from account settings.
    const email = Email.fromString(cmd.email);
    const userByEmail = await this.userRepo.findByEmail(email);
    if (userByEmail !== null) {
      if (userByEmail.passwordHash !== null) {
        throw new AccountLinkRequiresAuthError(cmd.provider);
      }
      // Social-only account with matching email — safe to link
      await this.identityRepo.link(userByEmail.id, identity);
      return { accessToken: this.tokenService.sign(this.payload(userByEmail)) };
    }

    // Path 3 — brand-new user
    const newId = UserId.create();
    const newUser = User.create({
      id: newId,
      email,
      passwordHash: null, // social-only account
      name: cmd.name,
      isAdmin: false,
    });
    await this.userRepo.save(newUser);
    await this.identityRepo.link(newId, identity);
    return { accessToken: this.tokenService.sign(this.payload(newUser)) };
  }

  private payload(user: User) {
    return {
      sub: user.id.value,
      email: user.email.value,
      isAdmin: user.isAdmin,
    };
  }
}
