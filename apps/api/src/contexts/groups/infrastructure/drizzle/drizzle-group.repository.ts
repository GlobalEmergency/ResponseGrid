import { and, eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { groupsTable } from './schema';
import { GroupRepository } from '../../domain/ports/group.repository';
import { Group } from '../../domain/group';
import { GroupVisibility, GroupOwnerScope } from '../../domain/group-enums';

type Row = typeof groupsTable.$inferSelect;

function rowToGroup(row: Row): Group {
  const ownerScope: GroupOwnerScope =
    row.ownerKind === 'organization'
      ? { kind: 'organization', organizationId: row.ownerId }
      : { kind: 'emergency', emergencyId: row.ownerId };
  return Group.fromSnapshot({
    id: row.id,
    name: row.name,
    visibility: row.visibility as GroupVisibility,
    ownerScope,
    parentGroupId: row.parentGroupId,
    createdAt: row.createdAt.toISOString(),
  });
}

function ownerColumns(owner: GroupOwnerScope): {
  ownerKind: string;
  ownerId: string;
} {
  return owner.kind === 'organization'
    ? { ownerKind: 'organization', ownerId: owner.organizationId }
    : { ownerKind: 'emergency', ownerId: owner.emergencyId };
}

export class DrizzleGroupRepository implements GroupRepository {
  constructor(private readonly db: Db) {}

  async save(group: Group): Promise<void> {
    const s = group.toSnapshot();
    const owner = ownerColumns(s.ownerScope);
    await this.db
      .insert(groupsTable)
      .values({
        id: s.id,
        name: s.name,
        visibility: s.visibility,
        ownerKind: owner.ownerKind,
        ownerId: owner.ownerId,
        parentGroupId: s.parentGroupId,
        createdAt: new Date(s.createdAt),
      })
      .onConflictDoUpdate({
        target: groupsTable.id,
        set: { name: s.name, visibility: s.visibility },
      });
  }

  async findById(id: string): Promise<Group | null> {
    const rows = await this.db
      .select()
      .from(groupsTable)
      .where(eq(groupsTable.id, id))
      .limit(1);
    return rows[0] ? rowToGroup(rows[0]) : null;
  }

  async listByOwner(owner: GroupOwnerScope): Promise<Group[]> {
    const cols = ownerColumns(owner);
    const rows = await this.db
      .select()
      .from(groupsTable)
      .where(
        and(
          eq(groupsTable.ownerKind, cols.ownerKind),
          eq(groupsTable.ownerId, cols.ownerId),
        ),
      );
    return rows.map(rowToGroup);
  }
}
