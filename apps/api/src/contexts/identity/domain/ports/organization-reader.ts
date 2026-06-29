export const ORGANIZATION_READER = Symbol('OrganizationReader');

/** An organization a user belongs to, with the role they hold there. */
export interface UserOrganizationMembership {
  organizationId: string;
  organizationName: string;
  role: string;
}

/**
 * Output port (DIP) the identity admin use cases use to read the organizations a
 * user belongs to — owned by the organizations context, adapted here so identity
 * does not depend on that context's module. Mirrors how #175 (organizations)
 * reads accreditations/service-accounts through its own reader ports.
 */
export interface OrganizationReader {
  listForUser(userId: string): Promise<UserOrganizationMembership[]>;
}
