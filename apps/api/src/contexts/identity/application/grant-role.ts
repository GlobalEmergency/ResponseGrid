import { randomUUID } from 'node:crypto';
import { GrantRepository } from '../domain/ports/grant.repository';
import {
  AccessControl,
  AuthorizationContext,
} from '../domain/authorization/access-control';
import { Grant } from '../domain/authorization/grant';
import {
  ScopeRef,
  ScopeRefProps,
  ancestorChain,
} from '../domain/authorization/scope-ref';
import {
  permissionsForRole,
  roleExists,
} from '../domain/authorization/role-catalog';
import {
  NotAuthorizedToGrantError,
  PrivilegeEscalationError,
  UnknownRoleError,
} from '../domain/authorization/errors';

export interface GrantRoleCommand {
  /** Who is granting — their effective grants for this request. */
  actor: AuthorizationContext;
  targetPrincipalId: string;
  roleId: string;
  scope: ScopeRefProps;
  expiresAt?: Date | null;
}

/**
 * Delegated role assignment with privilege attenuation (docs/features/13 §5, D1).
 *
 * The actor may grant role R in scope S only if:
 *   1. they hold `role:grant` at S (or an ancestor of S), and
 *   2. every permission R confers is one the actor already holds at S
 *      — so delegation can never escalate privilege.
 */
export class GrantRole {
  constructor(
    private readonly grants: GrantRepository,
    private readonly access: AccessControl,
  ) {}

  async execute(cmd: GrantRoleCommand): Promise<{ id: string }> {
    if (!roleExists(cmd.roleId)) {
      throw new UnknownRoleError(cmd.roleId);
    }

    const chain = ancestorChain(cmd.scope);
    const actorPermissions = await this.access.effectivePermissions(
      cmd.actor,
      chain,
    );

    // Rule 1: the actor must administer this scope.
    if (!actorPermissions.has('role:grant')) {
      throw new NotAuthorizedToGrantError(cmd.scope);
    }

    // Rule 2: attenuation — cannot confer permissions the actor lacks here.
    const escalated = permissionsForRole(cmd.roleId).filter(
      (p) => !actorPermissions.has(p),
    );
    if (escalated.length > 0) {
      throw new PrivilegeEscalationError(cmd.roleId, escalated);
    }

    const grant = Grant.create({
      id: randomUUID(),
      principalId: cmd.targetPrincipalId,
      roleId: cmd.roleId,
      scope: ScopeRef.fromProps(cmd.scope),
      grantedByPrincipalId: cmd.actor.principalId,
      expiresAt: cmd.expiresAt ?? null,
    });
    await this.grants.save(grant);
    return { id: grant.id };
  }
}
