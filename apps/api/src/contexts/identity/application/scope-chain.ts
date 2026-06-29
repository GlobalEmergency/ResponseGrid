import {
  ScopeRefProps,
  ancestorChain,
} from '../domain/authorization/scope-ref';
import { ResourceEmergencyLookup } from '../domain/ports/resource-emergency-lookup';

/**
 * Expands a scope into the authorization chain used by delegation / revocation.
 *
 * `entity(resource)` scopes are special: the effective admin chain must include
 * the owning emergency, not only the entity itself and platform. Other entity
 * types currently continue to behave like the generic ancestor chain until they
 * gain an owning-emergency lookup port of their own.
 */
export async function authorizationChainForScope(
  scope: ScopeRefProps,
  resourceEmergencyLookup: ResourceEmergencyLookup,
): Promise<ScopeRefProps[]> {
  if (scope.type === 'entity' && scope.entityType === 'resource') {
    const emergencyId = await resourceEmergencyLookup.findEmergencyId(scope.id);
    if (emergencyId !== null) {
      return [
        scope,
        { type: 'emergency', id: emergencyId },
        { type: 'platform' },
      ];
    }
  }

  return ancestorChain(scope);
}
