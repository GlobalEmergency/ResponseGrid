import { OrganizationRepository } from '../domain/ports/organization.repository';
import { OrganizationMemberRepository } from '../domain/ports/organization-member.repository';
import { UserDirectory } from '../domain/ports/user-directory';
import { AccreditationReader } from '../domain/ports/accreditation-reader';
import { ServiceAccountReader } from '../domain/ports/service-account-reader';
import { OrganizationId } from '../domain/organization-id';
import { OrganizationNotFoundError } from '../domain/errors';
import {
  OrganizationAdminDetail,
  OrganizationAdminMember,
  deriveAccreditationStatus,
} from './organization-admin-view';

export interface GetOrganizationAdminDetailQuery {
  organizationId: string;
}

/**
 * Admin detail of a single organization: core fields + members (with roles) +
 * service accounts / API keys + accreditations + emergencies it participates
 * in. Reuses the existing member, user-directory, accreditation and
 * service-account reads; adds no new domain logic. Gated by `org:read`.
 */
export class GetOrganizationAdminDetail {
  constructor(
    private readonly orgRepo: OrganizationRepository,
    private readonly memberRepo: OrganizationMemberRepository,
    private readonly userDirectory: UserDirectory,
    private readonly accreditations: AccreditationReader,
    private readonly serviceAccounts: ServiceAccountReader,
  ) {}

  async execute(
    query: GetOrganizationAdminDetailQuery,
  ): Promise<OrganizationAdminDetail> {
    const org = await this.orgRepo.findById(
      OrganizationId.fromString(query.organizationId),
    );
    if (!org) {
      throw new OrganizationNotFoundError(query.organizationId);
    }

    const [entries, accreditations, serviceAccounts] = await Promise.all([
      this.memberRepo.listMembers(org.id.value),
      this.accreditations.listForOrganization(org.id.value),
      this.serviceAccounts.listForOrganization(org.id.value),
    ]);

    const members: OrganizationAdminMember[] = [];
    for (const entry of entries) {
      const user = await this.userDirectory.findById(entry.userId);
      members.push({
        userId: entry.userId,
        email: user?.email ?? '',
        name: user?.name ?? '',
        role: entry.role,
      });
    }

    const emergencyIds = accreditations
      .map((a) => (a.scope === 'global' ? null : a.scope.emergencyId))
      .filter((id): id is string => id !== null);
    const uniqueEmergencyIds = [...new Set(emergencyIds)];

    return {
      id: org.id.value,
      name: org.name,
      type: org.type,
      taxId: org.taxId,
      contactEmail: org.contactEmail,
      verificationLevel: org.verificationLevel,
      createdAt: org.createdAt.toISOString(),
      accreditationStatus: deriveAccreditationStatus(accreditations),
      members,
      serviceAccounts,
      accreditations,
      emergencyIds: uniqueEmergencyIds,
    };
  }
}
