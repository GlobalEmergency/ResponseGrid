import {
  AccessControl,
  AuthorizationContext,
  ResourceRef,
} from './access-control';
import { Permission } from './permission';
import { ScopeRef, ScopeRefProps } from './scope-ref';
import { Grant } from './grant';
import { ROLE_CATALOG } from './role-catalog';

/**
 * In-process Policy Decision Point. Pure domain logic (no I/O): it evaluates the
 * grants carried in the {@link AuthorizationContext} against the resource's
 * scope chain and the fixed role catalog.
 *
 * Resolution algorithm (docs/features/13 §3.3):
 *   1. for each active grant whose scope covers any scope in the chain,
 *   2. union the permissions of its role,
 *   3. the action is allowed iff it is in that union.
 */
export class LocalAccessControl implements AccessControl {
  can(
    ctx: AuthorizationContext,
    action: Permission,
    resource: ResourceRef,
  ): Promise<boolean> {
    const perms = this.collect(ctx, resource.scopeChain);
    return Promise.resolve(perms.has(action));
  }

  effectivePermissions(
    ctx: AuthorizationContext,
    scopeChain: ScopeRefProps[],
  ): Promise<Set<Permission>> {
    return Promise.resolve(this.collect(ctx, scopeChain));
  }

  private collect(
    ctx: AuthorizationContext,
    scopeChainProps: ScopeRefProps[],
  ): Set<Permission> {
    const chain = scopeChainProps.map((p) => ScopeRef.fromProps(p));
    const now = new Date();
    const out = new Set<Permission>();

    for (const snapshot of ctx.grants) {
      const grant = Grant.fromSnapshot(snapshot);
      if (!grant.isActive(now)) continue;
      if (!grant.scope.coversAnyOf(chain)) continue;

      const role = ROLE_CATALOG[grant.roleId];
      if (role === undefined) continue; // unknown role → contributes nothing

      for (const permission of role.permissions) {
        out.add(permission);
      }
    }

    return out;
  }
}
