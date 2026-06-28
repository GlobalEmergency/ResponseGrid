import { ScopeRefProps } from '../domain/authorization/scope-ref';

/**
 * The authorization scope a service account / its keys live under: the owning
 * organization, or platform when ownerless.
 */
export function machineScope(
  ownerOrganizationId: string | null,
): ScopeRefProps {
  return ownerOrganizationId === null
    ? { type: 'platform' }
    : { type: 'organization', id: ownerOrganizationId };
}
