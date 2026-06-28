import { and, eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { groupMembersTable } from './schema';
import { GroupMemberRepository } from '../../domain/ports/group-member.repository';
import { GroupMember } from '../../domain/group-member';
import { GroupMemberStatus } from '../../domain/group-enums';

type Row = typeof groupMembersTable.$inferSelect;

function rowToMember(row: Row): GroupMember {
  return GroupMember.fromSnapshot({
    groupId: row.groupId,
    userId: row.userId,
    status: row.status as GroupMemberStatus,
    addedByUserId: row.addedByUserId,
  });
}

export class DrizzleGroupMemberRepository implements GroupMemberRepository {
  constructor(private readonly db: Db) {}

  async save(member: GroupMember): Promise<void> {
    const s = member.toSnapshot();
    await this.db
      .insert(groupMembersTable)
      .values({
        groupId: s.groupId,
        userId: s.userId,
        status: s.status,
        addedByUserId: s.addedByUserId,
      })
      .onConflictDoUpdate({
        target: [groupMembersTable.groupId, groupMembersTable.userId],
        set: { status: s.status, addedByUserId: s.addedByUserId },
      });
  }

  async find(groupId: string, userId: string): Promise<GroupMember | null> {
    const rows = await this.db
      .select()
      .from(groupMembersTable)
      .where(
        and(
          eq(groupMembersTable.groupId, groupId),
          eq(groupMembersTable.userId, userId),
        ),
      )
      .limit(1);
    return rows[0] ? rowToMember(rows[0]) : null;
  }

  async listByGroup(groupId: string): Promise<GroupMember[]> {
    const rows = await this.db
      .select()
      .from(groupMembersTable)
      .where(eq(groupMembersTable.groupId, groupId));
    return rows.map(rowToMember);
  }

  async listByUser(userId: string): Promise<GroupMember[]> {
    const rows = await this.db
      .select()
      .from(groupMembersTable)
      .where(eq(groupMembersTable.userId, userId));
    return rows.map(rowToMember);
  }
}
