export const SERVICE_ACCOUNT_READER = Symbol('ServiceAccountReader');

/** Service account (machine principal) owned by an organization, with key tallies. */
export interface OrganizationServiceAccount {
  id: string;
  name: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
  /** Total API keys ever issued for this service account. */
  keyCount: number;
  /** API keys currently active (not revoked, not expired). */
  activeKeyCount: number;
}

/**
 * Output port: lets the organizations context read the service accounts (and
 * their API-key tallies) owned by an organization without reaching into the
 * identity context's internals. Wired to an adapter over the identity
 * service-account / api-key repositories (DIP).
 */
export interface ServiceAccountReader {
  listForOrganization(
    organizationId: string,
  ): Promise<OrganizationServiceAccount[]>;
}
