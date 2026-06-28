import { GrantSnapshot } from '../domain/authorization/grant';
import { GrantRepository } from '../domain/ports/grant.repository';
import {
  AccessControl,
  AuthorizationContext,
} from '../domain/authorization/access-control';
import { Permission } from '../domain/authorization/permission';
import {
  ScopeRefProps,
  ancestorChain,
} from '../domain/authorization/scope-ref';
import { NotAuthorizedToReadError } from '../domain/authorization/errors';

/**
 * Permissions that make a principal an *administrator* of a scope — any of them
 * lets you see who holds roles there (the read side of scoped administration).
 */
const ADMIN_READ_PERMISSIONS: readonly Permission[] = [
  'role:grant',
  'user:read',
  'user:invite',
  'group:manage_members',
];

export interface ListGrantsAtScopeCommand {
  actor: AuthorizationContext;
  scope: ScopeRefProps;
}

/**
 * Lists the grants made AT a scope (who has which role here) so a scoped
 * administrator — platform admin, org admin, group manager, emergency
 * coordinator — can manage their own area. Authorization reuses the PDP: the
 * actor must hold an admin-read permission at the scope (or an ancestor), so an
 * org admin sees only their org and a platform admin sees any scope, with no
 * special-casing per role (docs/features/13 §3, §5).
 */
export class ListGrantsAtScope {
  constructor(
    private readonly grants: GrantRepository,
    private readonly access: AccessControl,
  ) {}

  async execute(cmd: ListGrantsAtScopeCommand): Promise<GrantSnapshot[]> {
    const perms = await this.access.effectivePermissions(
      cmd.actor,
      ancestorChain(cmd.scope),
    );
    if (!ADMIN_READ_PERMISSIONS.some((p) => perms.has(p))) {
      throw new NotAuthorizedToReadError('grants at this scope');
    }

    const scopeId = cmd.scope.type === 'platform' ? null : cmd.scope.id;
    const grants = await this.grants.findByScope(cmd.scope.type, scopeId);
    return grants.map((g) => g.toSnapshot());
  }
}
