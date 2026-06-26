import { OrganizationMemberRepository } from '../domain/ports/organization-member.repository';
import { UserDirectory } from '../domain/ports/user-directory';
import { OrganizationRole } from '../domain/organization-enums';
import {
  NotOrganizationOwnerError,
  UserNotFoundError,
  AlreadyMemberError,
} from '../domain/errors';

export interface AddOrganizationMemberCommand {
  organizationId: string;
  requesterUserId: string;
  email: string;
}

export class AddOrganizationMember {
  constructor(
    private readonly memberRepo: OrganizationMemberRepository,
    private readonly userDirectory: UserDirectory,
  ) {}

  async execute(cmd: AddOrganizationMemberCommand): Promise<void> {
    const requesterRole = await this.memberRepo.getRole(
      cmd.organizationId,
      cmd.requesterUserId,
    );
    if (requesterRole !== OrganizationRole.Owner) {
      throw new NotOrganizationOwnerError();
    }

    const user = await this.userDirectory.findByEmail(cmd.email);
    if (!user) {
      throw new UserNotFoundError(cmd.email);
    }

    const alreadyMember = await this.memberRepo.isMember(cmd.organizationId, user.id);
    if (alreadyMember) {
      throw new AlreadyMemberError();
    }

    await this.memberRepo.add(cmd.organizationId, user.id, OrganizationRole.Member);
  }
}
