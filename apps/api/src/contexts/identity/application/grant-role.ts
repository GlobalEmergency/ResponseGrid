import { randomUUID } from 'node:crypto';
import { GrantRepository } from '../domain/ports/grant.repository';
import {
  AccessControl,
  AuthorizationContext,
} from '../domain/authorization/access-control';
import { Grant } from '../domain/authorization/grant';
import { ScopeRef, ScopeRefProps } from '../domain/authorization/scope-ref';
import {
  permissionsForRole,
  roleExists,
} from '../domain/authorization/role-catalog';
import {
  InvalidGrantExpiryError,
  NotAuthorizedToGrantError,
  PrivilegeEscalationError,
  UnknownRoleError,
} from '../domain/authorization/errors';
import { ResourceEmergencyLookup } from '../domain/ports/resource-emergency-lookup';
import { authorizationChainForScope } from './scope-chain';

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
    private readonly resourceEmergencyLookup: ResourceEmergencyLookup,
  ) {}

  async execute(cmd: GrantRoleCommand): Promise<{ id: string }> {
    if (!roleExists(cmd.roleId)) {
      throw new UnknownRoleError(cmd.roleId);
    }

    if (
      cmd.expiresAt != null &&
      (Number.isNaN(cmd.expiresAt.getTime()) ||
        cmd.expiresAt.getTime() <= Date.now())
    ) {
      // Rejects both past expiries and Invalid Date (e.g. an unparseable
      // expiresAt string from the HTTP layer) — otherwise NaN <= now is false
      // and a "born-dead" grant with an Invalid Date would 500 on persist.
      throw new InvalidGrantExpiryError();
    }

    const chain = await authorizationChainForScope(
      cmd.scope,
      this.resourceEmergencyLookup,
    );
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
