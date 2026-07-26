export const AUDIT_TRAIL = Symbol('AuditTrail');

export interface AuditTrailFieldChange {
  field: string;
  before: unknown;
  after: unknown;
}

export interface SystemAuditEntry {
  action: string;
  entityType: string;
  entityId: string;
  emergencyId: string;
  targetStatus: string | null;
  changes: AuditTrailFieldChange[];
  reason: string;
}

/**
 * Records a system-attributed mutation in the activity trail — the equivalent
 * of the audit context's `AuditInterceptor` for actions that happen off an
 * HTTP request (e.g. an event-handler-driven automatic transition, #171). A
 * dedicated port owned by the resources context (DIP): the audit context
 * stays unaware of who calls it.
 */
export interface AuditTrail {
  recordSystemAction(entry: SystemAuditEntry): Promise<void>;
}
