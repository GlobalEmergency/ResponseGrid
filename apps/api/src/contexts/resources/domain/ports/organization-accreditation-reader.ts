/**
 * Output port used by the VerifyResource use case to determine whether the
 * resource's owner organization holds an accreditation covering the resource's
 * emergency.
 *
 * Infrastructure note: the adapter reads the `accreditations` table from the
 * accreditation context — an accepted cross-context infra coupling kept in the
 * adapter so the domain stays clean.
 */
export const ORGANIZATION_ACCREDITATION_READER = Symbol(
  'OrganizationAccreditationReader',
);

export interface OrganizationAccreditationReader {
  /**
   * Returns true when the organization has an active accreditation with
   * global scope OR with a scope matching the given emergencyId.
   */
  isAccredited(organizationId: string, emergencyId: string): Promise<boolean>;
}
