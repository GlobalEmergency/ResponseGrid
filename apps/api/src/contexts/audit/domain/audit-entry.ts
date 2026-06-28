/**
 * A single field-level change captured during an edit, for traceability.
 * `before`/`after` are stored verbatim (JSON) so the coordinator log can show
 * exactly what a value changed from and to.
 */
export interface AuditChange {
  field: string;
  before: unknown;
  after: unknown;
}

export interface AuditEntrySnapshot {
  id: string;
  actorUserId: string | null;
  /** Denormalised actor display name, captured at write time (nullable). */
  actorName: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  emergencyId: string | null;
  method: string;
  path: string;
  statusCode: number;
  /** Mandatory human reason for edit/discard actions; null for generic rows. */
  reason: string | null;
  /** Before/after field diff for edit actions; null otherwise. */
  changes: AuditChange[] | null;
  /** State the entity transitioned to (e.g. 'rejected'); null for pure edits. */
  targetStatus: string | null;
  createdAt: Date;
}

export interface CreateAuditEntryProps {
  id: string;
  actorUserId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  emergencyId: string | null;
  method: string;
  path: string;
  statusCode: number;
  /** Optional traceability enrichment (set by the acting controller). */
  actorName?: string | null;
  reason?: string | null;
  changes?: AuditChange[] | null;
  targetStatus?: string | null;
}

export class AuditEntry {
  private constructor(
    public readonly id: string,
    public readonly actorUserId: string | null,
    public readonly actorName: string | null,
    public readonly action: string,
    public readonly entityType: string | null,
    public readonly entityId: string | null,
    public readonly emergencyId: string | null,
    public readonly method: string,
    public readonly path: string,
    public readonly statusCode: number,
    public readonly reason: string | null,
    public readonly changes: AuditChange[] | null,
    public readonly targetStatus: string | null,
    public readonly createdAt: Date,
  ) {}

  static create(props: CreateAuditEntryProps): AuditEntry {
    return new AuditEntry(
      props.id,
      props.actorUserId,
      props.actorName ?? null,
      props.action,
      props.entityType,
      props.entityId,
      props.emergencyId,
      props.method,
      props.path,
      props.statusCode,
      props.reason ?? null,
      props.changes ?? null,
      props.targetStatus ?? null,
      new Date(),
    );
  }

  static fromSnapshot(s: AuditEntrySnapshot): AuditEntry {
    return new AuditEntry(
      s.id,
      s.actorUserId,
      s.actorName,
      s.action,
      s.entityType,
      s.entityId,
      s.emergencyId,
      s.method,
      s.path,
      s.statusCode,
      s.reason,
      s.changes,
      s.targetStatus,
      s.createdAt,
    );
  }

  toSnapshot(): AuditEntrySnapshot {
    return {
      id: this.id,
      actorUserId: this.actorUserId,
      actorName: this.actorName,
      action: this.action,
      entityType: this.entityType,
      entityId: this.entityId,
      emergencyId: this.emergencyId,
      method: this.method,
      path: this.path,
      statusCode: this.statusCode,
      reason: this.reason,
      changes: this.changes,
      targetStatus: this.targetStatus,
      createdAt: this.createdAt,
    };
  }
}
