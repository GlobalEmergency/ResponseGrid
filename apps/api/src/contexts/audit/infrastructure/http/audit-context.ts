import type { AuditChange } from '../../domain/audit-entry';

/**
 * Traceability enrichment a controller attaches to the request while handling a
 * mutation. The {@link AuditInterceptor} merges it into the persisted audit
 * entry, so coordinator-facing actions (edit / discard during validation) carry
 * the reason, the before/after diff, the resulting state and the actor's name.
 *
 * `emergencyId` is set explicitly because entity-scoped routes (e.g.
 * `/needs/:needId/discard`) have no `:emergencyId` param for the interceptor to
 * derive — the use case loads the entity and reports its owning emergency.
 */
export interface AuditMutationContext {
  reason?: string | null;
  changes?: AuditChange[] | null;
  targetStatus?: string | null;
  actorName?: string | null;
  emergencyId?: string | null;
}

/**
 * Minimal structural shape so any controller's request object (however it types
 * `req`) can carry the enrichment without coupling to express' Request type.
 */
export interface RequestWithAudit {
  auditContext?: AuditMutationContext;
}

/**
 * Attach (merging with any prior value) the audit enrichment to the request.
 * Accepts `object` so controllers can pass their own `req` type freely; the cast
 * to the carrier shape is localised here.
 */
export function setAuditContext(req: object, ctx: AuditMutationContext): void {
  const carrier = req as RequestWithAudit;
  carrier.auditContext = { ...(carrier.auditContext ?? {}), ...ctx };
}
