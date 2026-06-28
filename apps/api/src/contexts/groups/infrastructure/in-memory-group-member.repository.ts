import { GroupMemberRepository } from '../domain/ports/group-member.repository';
import { GroupMember, GroupMemberSnapshot } from '../domain/group-member';

export class InMemoryGroupMemberRepository implements GroupMemberRepository {
  private readonly store = new Map<string, GroupMemberSnapshot>();

  private key(groupId: string, userId: string): string {
    return `${groupId}:${userId}`;
  }

  save(member: GroupMember): Promise<void> {
    this.store.set(
      this.key(member.groupId, member.userId),
      member.toSnapshot(),
    );
    return Promise.resolve();
  }

  find(groupId: string, userId: string): Promise<GroupMember | null> {
    const s = this.store.get(this.key(groupId, userId));
    return Promise.resolve(s ? GroupMember.fromSnapshot(s) : null);
  }

  listByGroup(groupId: string): Promise<GroupMember[]> {
    return Promise.resolve(
      [...this.store.values()]
        .filter((s) => s.groupId === groupId)
        .map((s) => GroupMember.fromSnapshot(s)),
    );
  }
}
