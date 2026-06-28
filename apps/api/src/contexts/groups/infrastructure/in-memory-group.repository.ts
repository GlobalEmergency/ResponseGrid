import { GroupRepository } from '../domain/ports/group.repository';
import { Group, GroupSnapshot } from '../domain/group';
import { GroupOwnerScope } from '../domain/group-enums';

function sameOwner(a: GroupOwnerScope, b: GroupOwnerScope): boolean {
  if (a.kind !== b.kind) return false;
  return a.kind === 'organization' && b.kind === 'organization'
    ? a.organizationId === b.organizationId
    : a.kind === 'emergency' && b.kind === 'emergency'
      ? a.emergencyId === b.emergencyId
      : false;
}

export class InMemoryGroupRepository implements GroupRepository {
  private readonly store = new Map<string, GroupSnapshot>();

  save(group: Group): Promise<void> {
    this.store.set(group.id, group.toSnapshot());
    return Promise.resolve();
  }

  findById(id: string): Promise<Group | null> {
    const s = this.store.get(id);
    return Promise.resolve(s ? Group.fromSnapshot(s) : null);
  }

  listByOwner(owner: GroupOwnerScope): Promise<Group[]> {
    return Promise.resolve(
      [...this.store.values()]
        .filter((s) => sameOwner(s.ownerScope, owner))
        .map((s) => Group.fromSnapshot(s)),
    );
  }
}
