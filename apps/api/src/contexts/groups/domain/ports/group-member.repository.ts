import { GroupMember } from '../group-member';

export const GROUP_MEMBER_REPOSITORY = Symbol('GroupMemberRepository');

export interface GroupMemberRepository {
  save(member: GroupMember): Promise<void>;
  find(groupId: string, userId: string): Promise<GroupMember | null>;
  listByGroup(groupId: string): Promise<GroupMember[]>;
}
