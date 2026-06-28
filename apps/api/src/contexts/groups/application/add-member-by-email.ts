import { GroupRepository } from '../domain/ports/group.repository';
import { GroupMemberRepository } from '../domain/ports/group-member.repository';
import { GroupUserDirectory } from '../domain/ports/user-directory';
import { GroupMember } from '../domain/group-member';
import {
  AlreadyMemberError,
  GroupAccessDeniedError,
  GroupNotFoundError,
  UserNotFoundByEmailError,
} from '../domain/errors';
import {
  AccessControl,
  AuthorizationContext,
} from '../../identity/domain/authorization/access-control';
import { groupScopeChain } from './group-scope';

export interface AddMemberByEmailCommand {
  actor: AuthorizationContext;
  groupId: string;
  email: string;
}

/**
 * A manager adds a member directly by email (decision 2). The member is
 * approved immediately (no pending step, unlike a self-request). Gate:
 * `group:manage_members` over the group's `[group → owner → platform]` chain.
 */
export class AddMemberByEmail {
  constructor(
    private readonly groups: GroupRepository,
    private readonly members: GroupMemberRepository,
    private readonly directory: GroupUserDirectory,
    private readonly access: AccessControl,
  ) {}

  async execute(cmd: AddMemberByEmailCommand): Promise<{ userId: string }> {
    const group = await this.groups.findById(cmd.groupId);
    if (!group) throw new GroupNotFoundError(cmd.groupId);

    const allowed = await this.access.can(cmd.actor, 'group:manage_members', {
      scopeChain: groupScopeChain(group),
    });
    if (!allowed) throw new GroupAccessDeniedError('group:manage_members');

    const userId = await this.directory.findIdByEmail(cmd.email);
    if (!userId) throw new UserNotFoundByEmailError(cmd.email);

    const existing = await this.members.find(cmd.groupId, userId);
    if (existing) throw new AlreadyMemberError();

    await this.members.save(
      GroupMember.addApproved(cmd.groupId, userId, cmd.actor.principalId),
    );
    return { userId };
  }
}
