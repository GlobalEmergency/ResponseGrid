import { eq, and } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { membershipsTable } from './schema';
import { MembershipRepository } from '../../domain/ports/membership.repository';
import { Membership, MembershipSnapshot } from '../../domain/membership';
import { UserId } from '../../domain/user-id';
import { Role } from '../../domain/role';

type Row = typeof membershipsTable.$inferSelect;

function rowToSnapshot(row: Row): MembershipSnapshot {
  return {
    id: row.id,
    userId: row.userId,
    emergencyId: row.emergencyId,
    role: row.role as Role,
  };
}

export class DrizzleMembershipRepository implements MembershipRepository {
  constructor(private readonly db: Db) {}

  async save(membership: Membership): Promise<void> {
    const s = membership.toSnapshot();
    await this.db
      .insert(membershipsTable)
      .values({ id: s.id, userId: s.userId, emergencyId: s.emergencyId, role: s.role })
      .onConflictDoUpdate({
        target: [membershipsTable.userId, membershipsTable.emergencyId, membershipsTable.role],
        set: { role: s.role },
      });
  }

  async findByUser(userId: UserId): Promise<Membership[]> {
    const rows = await this.db
      .select()
      .from(membershipsTable)
      .where(eq(membershipsTable.userId, userId.value));
    return rows.map((r) => Membership.fromSnapshot(rowToSnapshot(r)));
  }

  async hasRole(userId: UserId, emergencyId: string, role: Role): Promise<boolean> {
    const rows = await this.db
      .select()
      .from(membershipsTable)
      .where(
        and(
          eq(membershipsTable.userId, userId.value),
          eq(membershipsTable.emergencyId, emergencyId),
          eq(membershipsTable.role, role),
        ),
      );
    return rows.length > 0;
  }
}
