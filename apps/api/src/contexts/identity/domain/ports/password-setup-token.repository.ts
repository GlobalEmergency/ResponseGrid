import { PasswordSetupToken } from '../password-setup-token';

export const PASSWORD_SETUP_TOKEN_REPOSITORY = Symbol(
  'PasswordSetupTokenRepository',
);

export interface PasswordSetupTokenRepository {
  save(token: PasswordSetupToken): Promise<void>;
  /** Look a token up by its stored hash (the raw secret is never stored). */
  findByHash(tokenHash: string): Promise<PasswordSetupToken | null>;
  /**
   * Mark every still-outstanding token of a user as used at `at`. Called on a
   * successful set-password: it consumes the token that was just spent AND
   * invalidates any other outstanding invites for that account, so no link can
   * be replayed.
   */
  markUsedForUser(userId: string, at: Date): Promise<void>;
}
