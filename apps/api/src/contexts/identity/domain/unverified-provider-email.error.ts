/**
 * Thrown when a social provider login brings an email that matches an existing
 * (social-only) account, but the provider did NOT assert that it verified
 * ownership of that email address.
 *
 * Auto-linking on an unverified email would let an attacker register a provider
 * identity claiming the victim's email and silently take over the victim's
 * existing account. Linking is therefore refused until the user authenticates
 * and links the provider explicitly from account settings.
 */
export class UnverifiedProviderEmailError extends Error {
  constructor(provider: string) {
    super(
      `The ${provider} account did not verify ownership of this email address, ` +
        `so it cannot be linked automatically. Please sign in first and link ` +
        `your ${provider} account from account settings.`,
    );
    this.name = 'UnverifiedProviderEmailError';
  }
}
