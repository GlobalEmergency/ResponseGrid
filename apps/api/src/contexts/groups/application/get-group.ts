import { GroupRepository } from '../domain/ports/group.repository';
import { GroupSnapshot } from '../domain/group';
import { GroupNotFoundError } from '../domain/errors';

/**
 * Read a group's basic info (name, visibility, owner). Low-sensitivity — any
 * authenticated user may read it, so the detail page works for both a manager
 * and a user deciding whether to request to join. The member list stays gated.
 */
export class GetGroup {
  constructor(private readonly groups: GroupRepository) {}

  async execute(groupId: string): Promise<GroupSnapshot> {
    const group = await this.groups.findById(groupId);
    if (!group) throw new GroupNotFoundError(groupId);
    return group.toSnapshot();
  }
}
