import { desc, eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import {
  UserActivityReader,
  UserActivityEntry,
} from '../../domain/ports/user-activity-reader';
// Cross-context infra coupling: the admin user detail surfaces a user's recent
// actions from the audit trail. Identity reads the audit_log table directly
// rather than importing the audit module, which already depends on identity
// (importing it back would be a cycle). DIP-clean via the port.
import { auditLogTable } from '../../../audit/infrastructure/drizzle/schema';

export class DrizzleUserActivityReader implements UserActivityReader {
  constructor(private readonly db: Db) {}

  async recentForUser(
    userId: string,
    limit: number,
  ): Promise<UserActivityEntry[]> {
    const rows = await this.db
      .select({
        id: auditLogTable.id,
        action: auditLogTable.action,
        entityType: auditLogTable.entityType,
        entityId: auditLogTable.entityId,
        emergencyId: auditLogTable.emergencyId,
        method: auditLogTable.method,
        path: auditLogTable.path,
        statusCode: auditLogTable.statusCode,
        createdAt: auditLogTable.createdAt,
      })
      .from(auditLogTable)
      .where(eq(auditLogTable.actorUserId, userId))
      .orderBy(desc(auditLogTable.createdAt))
      .limit(limit);

    return rows.map((r) => ({
      id: r.id,
      action: r.action,
      entityType: r.entityType ?? null,
      entityId: r.entityId ?? null,
      emergencyId: r.emergencyId ?? null,
      method: r.method,
      path: r.path,
      statusCode: r.statusCode,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
