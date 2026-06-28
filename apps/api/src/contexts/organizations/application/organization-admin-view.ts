import { OrganizationRole } from '../domain/organization-enums';
import { OrganizationAccreditation } from '../domain/ports/accreditation-reader';
import { OrganizationServiceAccount } from '../domain/ports/service-account-reader';

/**
 * Accreditation status of an organization, derived from its accreditations:
 * - `global`: holds a platform-wide accreditation (covers every emergency);
 * - `emergency`: holds at least one emergency-scoped accreditation;
 * - `none`: no accreditations.
 */
export type AccreditationStatus = 'global' | 'emergency' | 'none';

export function deriveAccreditationStatus(
  accreditations: readonly OrganizationAccreditation[],
): AccreditationStatus {
  if (accreditations.some((a) => a.scope === 'global')) return 'global';
  if (accreditations.length > 0) return 'emergency';
  return 'none';
}

/** Row of the admin organization list. */
export interface OrganizationAdminListItem {
  id: string;
  name: string;
  type: string;
  taxId: string | null;
  contactEmail: string | null;
  verificationLevel: string;
  memberCount: number;
  accreditationStatus: AccreditationStatus;
}

export interface OrganizationAdminMember {
  userId: string;
  email: string;
  name: string;
  role: OrganizationRole;
}

/** Full admin detail of a single organization. */
export interface OrganizationAdminDetail {
  id: string;
  name: string;
  type: string;
  taxId: string | null;
  contactEmail: string | null;
  verificationLevel: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
  accreditationStatus: AccreditationStatus;
  members: OrganizationAdminMember[];
  serviceAccounts: OrganizationServiceAccount[];
  accreditations: OrganizationAccreditation[];
  /** Emergencies the organization participates in (emergency-scoped accreditations). */
  emergencyIds: string[];
}
