import { and, desc, eq, SQL } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { AuditEntry, AuditEntrySnapshot } from '../../domain/audit-entry';
import {
  AuditQueryFilters,
  AuditRepository,
} from '../../domain/ports/audit.repository';
import { auditLogTable } from './schema';

type Row = typeof auditLogTable.$inferSelect;

function rowToSnapshot(row: Row): AuditEntrySnapshot {
  return {
    id: row.id,
    actorUserId: row.actorUserId ?? null,
    actorName: row.actorName ?? null,
    action: row.action,
    entityType: row.entityType ?? null,
    entityId: row.entityId ?? null,
    emergencyId: row.emergencyId ?? null,
    method: row.method,
    path: row.path,
    statusCode: row.statusCode,
    reason: row.reason ?? null,
    changes: row.changes ?? null,
    targetStatus: row.targetStatus ?? null,
    createdAt: row.createdAt,
  };
}

export class DrizzleAuditRepository implements AuditRepository {
  constructor(private readonly db: Db) {}

  async save(entry: AuditEntry): Promise<void> {
    const s = entry.toSnapshot();
    await this.db.insert(auditLogTable).values({
      id: s.id,
      actorUserId: s.actorUserId ?? null,
      actorName: s.actorName ?? null,
      action: s.action,
      entityType: s.entityType ?? null,
      entityId: s.entityId ?? null,
      emergencyId: s.emergencyId ?? null,
      method: s.method,
      path: s.path,
      statusCode: s.statusCode,
      reason: s.reason ?? null,
      changes: s.changes ?? null,
      targetStatus: s.targetStatus ?? null,
      createdAt: s.createdAt,
    });
  }

  async findAll(filters: AuditQueryFilters): Promise<AuditEntry[]> {
    const conditions: SQL[] = [];

    if (filters.emergencyId) {
      conditions.push(eq(auditLogTable.emergencyId, filters.emergencyId));
    }
    if (filters.actorUserId) {
      conditions.push(eq(auditLogTable.actorUserId, filters.actorUserId));
    }
    if (filters.entityType) {
      conditions.push(eq(auditLogTable.entityType, filters.entityType));
    }

    const limit = filters.limit ?? 100;
    const offset = filters.offset ?? 0;

    const rows = await this.db
      .select()
      .from(auditLogTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogTable.createdAt))
      .limit(limit)
      .offset(offset);

    return rows.map((r) => AuditEntry.fromSnapshot(rowToSnapshot(r)));
  }
}
