/**
 * Pure presentation helpers for the admin users pages: maps backend enum values
 * to localized labels and to shared Badge variants. Safe to import from Server
 * or Client Components.
 */
import type { Messages } from '@/i18n/messages/es';
import type { UserGrant } from './actions';

type AdminMessages = Messages['admin'];

const SCOPE_TYPE_KEYS: Record<string, keyof AdminMessages> = {
  platform: 'users_scope_platform',
  organization: 'users_scope_organization',
  emergency: 'users_scope_emergency',
  group: 'users_scope_group',
  entity: 'users_scope_entity',
  hub: 'users_scope_hub',
  corridor: 'users_scope_corridor',
};

export function scopeTypeLabel(scopeType: string, ta: AdminMessages): string {
  const key = SCOPE_TYPE_KEYS[scopeType];
  return key ? ta[key] : scopeType;
}

/**
 * The label shown for a grant's scope: the resolved name when available
 * (organization/emergency/group), otherwise the localized scope-type word
 * (platform) or a shortened id fallback.
 */
export function grantScopeLabel(grant: UserGrant, ta: AdminMessages): string {
  if (grant.scopeName) return grant.scopeName;
  if (grant.scopeType === 'platform') return ta.users_scope_platform;
  return scopeTypeLabel(grant.scopeType, ta);
}

/** True when a grant has an expiry that is already in the past. */
export function isExpired(grant: UserGrant, now: Date = new Date()): boolean {
  return grant.expiresAt !== null && new Date(grant.expiresAt) <= now;
}
