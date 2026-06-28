export const ACCREDITATION_READER = Symbol('AccreditationReader');

/** Accreditation as seen from the organizations context (read-only projection). */
export interface OrganizationAccreditation {
  id: string;
  scope: 'global' | { emergencyId: string };
  grantedByUserId: string;
  /** ISO 8601 timestamp. */
  grantedAt: string;
  evidence: string | null;
}

/**
 * Output port: lets the organizations context read an organization's
 * accreditations without depending on the accreditation context's internals.
 * Wired in the module to a thin adapter over the accreditation repository (DIP).
 */
export interface AccreditationReader {
  listForOrganization(
    organizationId: string,
  ): Promise<OrganizationAccreditation[]>;
}
