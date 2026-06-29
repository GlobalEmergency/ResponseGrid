export const DONOR_ACCOUNT_PORT = Symbol('DonorAccountPort');

export interface DonorAccountInput {
  email: string;
  name: string;
  phone: string | null;
}

/**
 * Resolves a donor to a platform user id, creating a passwordless profile if
 * none exists for the email (#168). Returns the user id, or null when it can't
 * (e.g. malformed email): linking a donation to an account is best-effort and
 * must never block the pre-registration itself.
 */
export interface DonorAccountPort {
  ensureByContact(input: DonorAccountInput): Promise<string | null>;
}
