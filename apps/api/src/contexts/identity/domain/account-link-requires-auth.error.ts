/**
 * Thrown when a social provider login brings an email that already belongs to
 * a password-based account without a pre-existing identity link for that
 * provider.
 *
 * Auto-linking in this scenario would allow an attacker who controls a Google
 * (or Facebook) account with the victim's email to take over the victim's
 * account. The user must first authenticate with their password and explicitly
 * link the social identity from account settings.
 */
export class AccountLinkRequiresAuthError extends Error {
  constructor(provider: string) {
    super(
      `An account already exists for this email address with a password. ` +
        `Please sign in with your password and link your ${provider} account from account settings.`,
    );
    this.name = 'AccountLinkRequiresAuthError';
  }
}
