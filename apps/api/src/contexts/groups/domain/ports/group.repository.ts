import { Group } from '../group';
import { GroupOwnerScope } from '../group-enums';

export const GROUP_REPOSITORY = Symbol('GroupRepository');

export interface GroupRepository {
  save(group: Group): Promise<void>;
  findById(id: string): Promise<Group | null>;
  listByOwner(owner: GroupOwnerScope): Promise<Group[]>;
}
