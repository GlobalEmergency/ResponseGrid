export const SCOPE_NAME_READER = Symbol('ScopeNameReader');

/**
 * Output port (DIP) that resolves a grant's scope to a human-readable name —
 * organization / emergency / group display names — so the admin user detail can
 * show "Coordinador @ Terremoto Venezuela 2026" instead of a bare UUID. Platform
 * and entity scopes have no name and resolve to null. The adapter reads the
 * owning tables directly (names only, no domain logic).
 */
export interface ScopeNameReader {
  nameFor(scopeType: string, scopeId: string): Promise<string | null>;
}
