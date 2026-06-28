import { AuditEntry } from '../../domain/audit-entry';
import { AuditEntryDto } from './audit.dto';

/** Map a domain {@link AuditEntry} to its wire DTO (shared by both controllers). */
export function toAuditEntryDto(e: AuditEntry): AuditEntryDto {
  return {
    id: e.id,
    actorUserId: e.actorUserId,
    actorName: e.actorName,
    action: e.action,
    entityType: e.entityType,
    entityId: e.entityId,
    emergencyId: e.emergencyId,
    method: e.method,
    path: e.path,
    statusCode: e.statusCode,
    reason: e.reason,
    changes: e.changes,
    targetStatus: e.targetStatus,
    createdAt: e.createdAt,
  };
}
