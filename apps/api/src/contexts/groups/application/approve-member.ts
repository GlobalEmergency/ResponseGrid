import { GroupRepository } from '../domain/ports/group.repository';
import { GroupMemberRepository } from '../domain/ports/group-member.repository';
import {
  GroupAccessDeniedError,
  GroupNotFoundError,
  MemberNotFoundError,
} from '../domain/errors';
import {
  AccessControl,
  AuthorizationContext,
} from '../../identity/domain/authorization/access-control';
import { groupScopeChain } from './group-scope';

export interface ApproveMemberCommand {
  actor: AuthorizationContext;
  groupId: string;
  userId: string;
}

/**
 * Approve a pending join request. Gate: `group:manage_members` over the group's
 * `[group → owner → platform]` chain — so a group manager (grant at the group)
 * **or** an org/emergency admin above it both qualify.
 */
export class ApproveMember {
  constructor(
    private readonly groups: GroupRepository,
    private readonly members: GroupMemberRepository,
    private readonly access: AccessControl,
  ) {}

  async execute(cmd: ApproveMemberCommand): Promise<void> {
    const group = await this.groups.findById(cmd.groupId);
    if (!group) throw new GroupNotFoundError(cmd.groupId);

    const allowed = await this.access.can(cmd.actor, 'group:manage_members', {
      scopeChain: groupScopeChain(group),
    });
    if (!allowed) throw new GroupAccessDeniedError('group:manage_members');

    const member = await this.members.find(cmd.groupId, cmd.userId);
    if (!member) throw new MemberNotFoundError();

    await this.members.save(member.approve(cmd.actor.principalId));
  }
}
