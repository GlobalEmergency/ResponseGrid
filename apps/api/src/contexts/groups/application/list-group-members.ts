import { GroupRepository } from '../domain/ports/group.repository';
import { GroupMemberRepository } from '../domain/ports/group-member.repository';
import { GroupMemberSnapshot } from '../domain/group-member';
import { GroupAccessDeniedError, GroupNotFoundError } from '../domain/errors';
import {
  AccessControl,
  AuthorizationContext,
} from '../../identity/domain/authorization/access-control';
import { groupScopeChain } from './group-scope';

export interface ListGroupMembersQuery {
  actor: AuthorizationContext;
  groupId: string;
}

/** List a group's members. Gate: `group:read` over the group's scope chain. */
export class ListGroupMembers {
  constructor(
    private readonly groups: GroupRepository,
    private readonly members: GroupMemberRepository,
    private readonly access: AccessControl,
  ) {}

  async execute(query: ListGroupMembersQuery): Promise<GroupMemberSnapshot[]> {
    const group = await this.groups.findById(query.groupId);
    if (!group) throw new GroupNotFoundError(query.groupId);

    const allowed = await this.access.can(query.actor, 'group:read', {
      scopeChain: groupScopeChain(group),
    });
    if (!allowed) throw new GroupAccessDeniedError('group:read');

    const members = await this.members.listByGroup(query.groupId);
    return members.map((m) => m.toSnapshot());
  }
}
