import { OrganizationRepository } from '../domain/ports/organization.repository';
import { OrganizationMemberRepository } from '../domain/ports/organization-member.repository';
import { AccreditationReader } from '../domain/ports/accreditation-reader';
import {
  OrganizationAdminListItem,
  deriveAccreditationStatus,
} from './organization-admin-view';

/**
 * Admin global list of ALL organizations, enriched with member count and
 * accreditation status. Gated by `org:read` at the controller (admin-only in
 * practice; platform_operator/platform_admin hold it at platform scope).
 */
export class ListOrganizationsAdmin {
  constructor(
    private readonly orgRepo: OrganizationRepository,
    private readonly memberRepo: OrganizationMemberRepository,
    private readonly accreditations: AccreditationReader,
  ) {}

  async execute(): Promise<OrganizationAdminListItem[]> {
    const orgs = await this.orgRepo.listAll();

    const items = await Promise.all(
      orgs.map(async (org): Promise<OrganizationAdminListItem> => {
        const [members, accreditations] = await Promise.all([
          this.memberRepo.listMembers(org.id.value),
          this.accreditations.listForOrganization(org.id.value),
        ]);
        return {
          id: org.id.value,
          name: org.name,
          type: org.type,
          taxId: org.taxId,
          contactEmail: org.contactEmail,
          verificationLevel: org.verificationLevel,
          memberCount: members.length,
          accreditationStatus: deriveAccreditationStatus(accreditations),
        };
      }),
    );

    items.sort((a, b) => a.name.localeCompare(b.name));
    return items;
  }
}
