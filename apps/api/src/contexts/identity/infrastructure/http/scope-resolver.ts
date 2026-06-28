import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { ScopeRefProps } from '../../domain/authorization/scope-ref';

export const SCOPE_RESOLVER = Symbol('ScopeResolver');

/**
 * Builds the ancestor scope chain (most specific → platform) for the resource
 * targeted by a request, so the PDP can decide which grants apply.
 */
export interface ScopeResolver {
  resolve(request: Request): Promise<ScopeRefProps[]>;
}

/**
 * Default resolver covering emergency- and platform-scoped routes:
 *   `/emergencies/:emergencyId/...` → [emergency, platform]
 *   everything else                 → [platform]
 *
 * Entity-scoped routes (`:resourceId`, `:needId`, …) are resolved by dedicated
 * resolvers that reuse the existing *EmergencyLookup ports; see docs/features/13
 * §9. Platform is always appended as the hierarchy root so platform-scoped
 * grants cover every request.
 */
@Injectable()
export class RequestScopeResolver implements ScopeResolver {
  resolve(request: Request): Promise<ScopeRefProps[]> {
    const params = (request.params ?? {}) as Record<string, string | undefined>;
    const chain: ScopeRefProps[] = [];

    const emergencyId = params.emergencyId;
    if (emergencyId) {
      chain.push({ type: 'emergency', id: emergencyId });
    }

    chain.push({ type: 'platform' });
    return Promise.resolve(chain);
  }
}
