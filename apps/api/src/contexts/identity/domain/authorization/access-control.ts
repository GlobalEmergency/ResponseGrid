import { Permission } from './permission';
import { ScopeRefProps } from './scope-ref';
import { GrantSnapshot } from './grant';

export const ACCESS_CONTROL = Symbol('AccessControl');

/**
 * The principal's effective grants for a request. Today these come from the JWT
 * (decision D3); tomorrow they may come from a Redis cache or an external engine
 * — callers do not change. See docs/features/13 §9.
 */
export interface AuthorizationContext {
  principalId: string;
  grants: GrantSnapshot[];
}

/**
 * A resource expressed as its ancestor scope chain, most specific → platform.
 * The chain is a flat set of ancestors, so multi-parent (DAG) resources are
 * supported (see docs/features/13 §16).
 */
export interface ResourceRef {
  scopeChain: ScopeRefProps[];
  /** Optional attributes for future ABAC conditions (ownership, sensitivity…). */
  attributes?: Record<string, unknown>;
}

/**
 * Policy Decision Point (PDP). The local implementation resolves in-process
 * against the grants in the context; a future adapter can resolve against a
 * cache or an external engine (OpenFGA/SpiceDB) without changing callers.
 * `can()` is async so that swap is a non-event.
 */
export interface AccessControl {
  can(
    ctx: AuthorizationContext,
    action: Permission,
    resource: ResourceRef,
  ): Promise<boolean>;

  effectivePermissions(
    ctx: AuthorizationContext,
    scopeChain: ScopeRefProps[],
  ): Promise<Set<Permission>>;
}
