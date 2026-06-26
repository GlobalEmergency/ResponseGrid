import { OrganizationMemberRepository } from '../domain/ports/organization-member.repository';
import { UserDirectory } from '../domain/ports/user-directory';
import { OrganizationRole } from '../domain/organization-enums';
import { NotMemberError } from '../domain/errors';

export interface ListOrganizationMembersQuery {
  organizationId: string;
  requesterUserId: string;
}

export interface OrganizationMemberView {
  userId: string;
  email: string;
  name: string;
  role: OrganizationRole;
}

export class ListOrganizationMembers {
  constructor(
    private readonly memberRepo: OrganizationMemberRepository,
    private readonly userDirectory: UserDirectory,
  ) {}

  async execute(query: ListOrganizationMembersQuery): Promise<OrganizationMemberView[]> {
    const requesterIsMember = await this.memberRepo.isMember(
      query.organizationId,
      query.requesterUserId,
    );
    if (!requesterIsMember) {
      throw new NotMemberError();
    }

    const entries = await this.memberRepo.listMembers(query.organizationId);

    const views: OrganizationMemberView[] = [];
    for (const entry of entries) {
      const user = await this.userDirectory.findById(entry.userId);
      if (user) {
        views.push({
          userId: user.id,
          email: user.email,
          name: user.name,
          role: entry.role,
        });
      }
    }

    return views;
  }
}
