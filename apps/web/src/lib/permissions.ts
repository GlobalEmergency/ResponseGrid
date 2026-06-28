/**
 * Shared helpers for the permissions UI (grants, roles, scopes, groups).
 * Pure presentation utilities — safe to import from Server or Client Components.
 */

export const SCOPE_TYPE_LABELS: Record<string, string> = {
  platform: 'Plataforma',
  organization: 'Organización',
  emergency: 'Emergencia',
  group: 'Grupo',
  entity: 'Entidad',
};

export function scopeTypeLabel(scopeType: string): string {
  return SCOPE_TYPE_LABELS[scopeType] ?? scopeType;
}

/** A compact, human label for a scope, e.g. "Organización · a1b2c3d4…". */
export function scopeLabel(scopeType: string, scopeId: string | null): string {
  const base = scopeTypeLabel(scopeType);
  if (scopeType === 'platform' || !scopeId) return base;
  return `${base} · ${shortId(scopeId)}`;
}

/** Shorten a UUID for display without losing recognizability. */
export function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

/** Scope types selectable when granting a role (entity scopes are internal). */
export const GRANTABLE_SCOPE_TYPES = [
  'platform',
  'organization',
  'emergency',
  'group',
] as const;
