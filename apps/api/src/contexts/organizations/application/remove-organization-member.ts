import { OrganizationMemberRepository } from '../domain/ports/organization-member.repository';
import { OrganizationRole } from '../domain/organization-enums';
import {
  NotOrganizationOwnerError,
  NotMemberError,
  CannotRemoveSelfError,
} from '../domain/errors';

export interface RemoveOrganizationMemberCommand {
  organizationId: string;
  requesterUserId: string;
  targetUserId: string;
}

export class RemoveOrganizationMember {
  constructor(private readonly memberRepo: OrganizationMemberRepository) {}

  async execute(cmd: RemoveOrganizationMemberCommand): Promise<void> {
    const requesterRole = await this.memberRepo.getRole(
      cmd.organizationId,
      cmd.requesterUserId,
    );
    if (requesterRole !== OrganizationRole.Owner) {
      throw new NotOrganizationOwnerError();
    }

    // Rule: owner cannot remove themselves (they are the only owner — prevents orphan org)
    if (cmd.requesterUserId === cmd.targetUserId) {
      throw new CannotRemoveSelfError();
    }

    const targetIsMember = await this.memberRepo.isMember(
      cmd.organizationId,
      cmd.targetUserId,
    );
    if (!targetIsMember) {
      throw new NotMemberError();
    }

    await this.memberRepo.remove(cmd.organizationId, cmd.targetUserId);
  }
}
