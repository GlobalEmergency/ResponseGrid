import { GroupMemberStatus } from './group-enums';

export interface GroupMemberSnapshot {
  groupId: string;
  userId: string;
  status: GroupMemberStatus;
  /** Manager who added/approved the member; null for a self-request. */
  addedByUserId: string | null;
}

export class GroupMember {
  private constructor(
    public readonly groupId: string,
    public readonly userId: string,
    public readonly status: GroupMemberStatus,
    public readonly addedByUserId: string | null,
  ) {}

  /** A self-requested join on a public group (awaits approval). */
  static request(groupId: string, userId: string): GroupMember {
    return new GroupMember(groupId, userId, GroupMemberStatus.Pending, null);
  }

  /** Added directly by a manager (approved immediately). */
  static addApproved(
    groupId: string,
    userId: string,
    addedByUserId: string,
  ): GroupMember {
    return new GroupMember(
      groupId,
      userId,
      GroupMemberStatus.Approved,
      addedByUserId,
    );
  }

  approve(byUserId: string): GroupMember {
    return new GroupMember(
      this.groupId,
      this.userId,
      GroupMemberStatus.Approved,
      this.addedByUserId ?? byUserId,
    );
  }

  get isApproved(): boolean {
    return this.status === GroupMemberStatus.Approved;
  }

  static fromSnapshot(s: GroupMemberSnapshot): GroupMember {
    return new GroupMember(s.groupId, s.userId, s.status, s.addedByUserId);
  }

  toSnapshot(): GroupMemberSnapshot {
    return {
      groupId: this.groupId,
      userId: this.userId,
      status: this.status,
      addedByUserId: this.addedByUserId,
    };
  }
}
