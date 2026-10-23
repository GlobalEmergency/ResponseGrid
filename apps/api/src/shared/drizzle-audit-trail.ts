import { randomUUID } from 'node:crypto';
import { Db } from './db';
import { AuditEntry } from '../contexts/audit/domain/audit-entry';
import { DrizzleAuditRepository } from '../contexts/audit/infrastructure/drizzle/drizzle-audit.repository';
import {
  AuditTrail,
  SystemAuditEntry,
} from '../contexts/resources/domain/ports/audit-trail';

/**
 * Shared Drizzle adapter — persists a system-attributed audit entry directly
 * (there is no HTTP request for `AuditInterceptor` to piggyback on, unlike a
 * coordinator's confirm_closed action). Used by the resources context's
 * automatic dispute-resolution handler (#171) so the auto-hide action leaves
 * the same activity-trail entry a human coordinator's action would, attributed
 * to "system" instead of a user. Accepted cross-context infra coupling,
 * following the same pattern as DrizzleEmergencyDisputeThresholdReader.
 */
export class DrizzleAuditTrail implements AuditTrail {
  private readonly repo: DrizzleAuditRepository;

  constructor(db: Db) {
    this.repo = new DrizzleAuditRepository(db);
  }

  async recordSystemAction(entry: SystemAuditEntry): Promise<void> {
    await this.repo.save(
      AuditEntry.create({
        id: randomUUID(),
        actorUserId: null,
        actorName: 'system',
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        emergencyId: entry.emergencyId,
        method: 'SYSTEM',
        path: `/internal/${entry.action}`,
        statusCode: 200,
        reason: entry.reason,
        changes: entry.changes,
        targetStatus: entry.targetStatus,
      }),
    );
  }
}
