/**
 * Shared traceability shapes returned by edit/discard use cases across contexts
 * (needs, resources, offers, reports). The HTTP layer forwards these to the
 * audit interceptor, which persists them as the activity trail of an emergency.
 *
 * Kept framework-free in the shared kernel so the application layer can build it
 * without importing the audit context's infrastructure.
 */

/** A single field's before/after value, captured during an edit. */
export interface AuditFieldChange {
  field: string;
  before: unknown;
  after: unknown;
}

/**
 * What an edit/discard use case reports for the audit trail:
 * - `emergencyId` — the entity's owning emergency (entity-scoped routes carry
 *   no `:emergencyId`, so the use case must surface it).
 * - `changes` — the before/after diff (empty for a no-op edit).
 * - `targetStatus` — the state the entity transitioned to, or null when the
 *   status did not change (pure field edit).
 */
export interface MutationAuditResult {
  emergencyId: string;
  changes: AuditFieldChange[];
  targetStatus: string | null;
}

/**
 * Compare two flat field maps and return only the fields whose value changed.
 * Used by edit use cases to build the audit diff from a before/after snapshot.
 */
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): AuditFieldChange[] {
  const changes: AuditFieldChange[] = [];
  for (const field of Object.keys(after)) {
    if (before[field] !== after[field]) {
      changes.push({ field, before: before[field], after: after[field] });
    }
  }
  return changes;
}
