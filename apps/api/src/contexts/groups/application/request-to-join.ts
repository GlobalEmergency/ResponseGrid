import { GroupRepository } from '../domain/ports/group.repository';
import { GroupMemberRepository } from '../domain/ports/group-member.repository';
import { GroupMember } from '../domain/group-member';
import {
  AlreadyMemberError,
  GroupNotFoundError,
  GroupNotPublicError,
} from '../domain/errors';

export interface RequestToJoinCommand {
  actorUserId: string;
  groupId: string;
}

/**
 * Self-service join request for a *public* group. Anyone authenticated may
 * request; the membership starts `pending` and a manager approves it later
 * (decision 2). Private groups reject self-requests — managers add their
 * members directly. See docs/features/13 §6.
 */
export class RequestToJoin {
  constructor(
    private readonly groups: GroupRepository,
    private readonly members: GroupMemberRepository,
  ) {}

  async execute(cmd: RequestToJoinCommand): Promise<void> {
    const group = await this.groups.findById(cmd.groupId);
    if (!group) throw new GroupNotFoundError(cmd.groupId);
    if (!group.isPublic) throw new GroupNotPublicError(cmd.groupId);

    const existing = await this.members.find(cmd.groupId, cmd.actorUserId);
    if (existing) throw new AlreadyMemberError();

    await this.members.save(GroupMember.request(cmd.groupId, cmd.actorUserId));
  }
}
