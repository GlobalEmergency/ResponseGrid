import { GrantSnapshot } from '../domain/authorization/grant';
import { GrantRepository } from '../domain/ports/grant.repository';
import { UserRepository } from '../domain/ports/user.repository';
import { ServiceAccountRepository } from '../domain/ports/service-account.repository';
import { UserId } from '../domain/user-id';
import {
  AccessControl,
  AuthorizationContext,
} from '../domain/authorization/access-control';
import { Permission } from '../domain/authorization/permission';
import { ScopeRefProps } from '../domain/authorization/scope-ref';
import { NotAuthorizedToReadError } from '../domain/authorization/errors';
import { ResourceEmergencyLookup } from '../domain/ports/resource-emergency-lookup';
import { authorizationChainForScope } from './scope-chain';

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

/** A grant at a scope, enriched with its principal's display info. */
export interface ScopeGrantView {
  grant: GrantSnapshot;
  principalName: string | null;
  principalEmail: string | null;
}

/**
 * Lists the grants made AT a scope (who has which role here), enriched with each
 * principal's name/email, so a scoped administrator — platform admin, org admin,
 * group manager, emergency coordinator — can manage their own area. Authorization
 * reuses the PDP: the actor must hold an admin-read permission at the scope (or
 * an ancestor), so an org admin sees only their org and a platform admin sees
 * any scope, with no special-casing per role (docs/features/13 §3, §5).
 */
export class ListGrantsAtScope {
  constructor(
    private readonly grants: GrantRepository,
    private readonly access: AccessControl,
    private readonly users: UserRepository,
    private readonly serviceAccounts: ServiceAccountRepository,
    private readonly resourceEmergencyLookup: ResourceEmergencyLookup,
  ) {}

  async execute(cmd: ListGrantsAtScopeCommand): Promise<ScopeGrantView[]> {
    const scopeChain = await authorizationChainForScope(
      cmd.scope,
      this.resourceEmergencyLookup,
    );
    const perms = await this.access.effectivePermissions(cmd.actor, scopeChain);
    if (!ADMIN_READ_PERMISSIONS.some((p) => perms.has(p))) {
      throw new NotAuthorizedToReadError('grants at this scope');
    }

    const scopeId = cmd.scope.type === 'platform' ? null : cmd.scope.id;
    const grants = await this.grants.findByScope(cmd.scope.type, scopeId);
    const snapshots = grants.map((g) => g.toSnapshot());

    const directory = await this.resolvePrincipals(snapshots);
    return snapshots.map((grant) => {
      const entry = directory.get(grant.principalId);
      return {
        grant,
        principalName: entry?.name ?? null,
        principalEmail: entry?.email ?? null,
      };
    });
  }

  /** Resolve each distinct principal to a display name / email (small N). */
  private async resolvePrincipals(
    snapshots: GrantSnapshot[],
  ): Promise<Map<string, { name: string | null; email: string | null }>> {
    const directory = new Map<
      string,
      { name: string | null; email: string | null }
    >();
    for (const g of snapshots) {
      if (directory.has(g.principalId)) continue;
      if (g.principalType === 'service_account') {
        const sa = await this.serviceAccounts.findById(g.principalId);
        directory.set(g.principalId, { name: sa?.name ?? null, email: null });
      } else {
        const user = await this.findUserSafe(g.principalId);
        directory.set(g.principalId, {
          name: user?.name ?? null,
          email: user?.email ?? null,
        });
      }
    }
    return directory;
  }

  private async findUserSafe(
    principalId: string,
  ): Promise<{ name: string; email: string } | null> {
    let userId: UserId;
    try {
      userId = UserId.fromString(principalId);
    } catch {
      return null;
    }
    const user = await this.users.findById(userId);
    return user ? { name: user.name, email: user.email.value } : null;
  }
}
