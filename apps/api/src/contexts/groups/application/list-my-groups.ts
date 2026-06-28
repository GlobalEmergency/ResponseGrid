import { GroupRepository } from '../domain/ports/group.repository';
import { GroupMemberRepository } from '../domain/ports/group-member.repository';
import { GroupSnapshot } from '../domain/group';
import { GroupMemberStatus } from '../domain/group-enums';

export interface MyGroup {
  group: GroupSnapshot;
  status: GroupMemberStatus;
}

/** Groups the current user belongs to (any status), for their "mis grupos" view. */
export class ListMyGroups {
  constructor(
    private readonly groups: GroupRepository,
    private readonly members: GroupMemberRepository,
  ) {}

  async execute(userId: string): Promise<MyGroup[]> {
    const memberships = await this.members.listByUser(userId);
    const result: MyGroup[] = [];
    for (const m of memberships) {
      const group = await this.groups.findById(m.groupId);
      if (group) result.push({ group: group.toSnapshot(), status: m.status });
    }
    return result;
  }
}
