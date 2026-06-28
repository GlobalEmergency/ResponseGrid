import { randomUUID } from 'node:crypto';
import { GroupRepository } from '../domain/ports/group.repository';
import { GroupMemberRepository } from '../domain/ports/group-member.repository';
import {
  GroupAccessDeniedError,
  GroupNotFoundError,
  GroupPrivilegeEscalationError,
  MemberNotFoundError,
} from '../domain/errors';
import { GrantRepository } from '../../identity/domain/ports/grant.repository';
import {
  AccessControl,
  AuthorizationContext,
} from '../../identity/domain/authorization/access-control';
import { Grant } from '../../identity/domain/authorization/grant';
import { ScopeRef } from '../../identity/domain/authorization/scope-ref';
import { permissionsForRole } from '../../identity/domain/authorization/role-catalog';
import { groupScopeChain } from './group-scope';

export interface AssignGroupManagerCommand {
  actor: AuthorizationContext;
  groupId: string;
  userId: string;
}

const MANAGER_ROLE = 'group_manager';

/**
 * Appoint an existing member as a co-manager — "the same role I hold"
 * (decision 3). This is delegation **with privilege attenuation** (§5) over the
 * group's full `[group → owner → platform]` chain:
 *
 *   1. the actor must administer the group (`role:grant` here), and
 *   2. every permission `group_manager` confers must already be one the actor
 *      holds here — so a co-manager is never stronger than the appointer.
 *
 * The bootstrap manager from `CreateGroup` satisfies both; a bare org admin who
 * never managed the group is blocked by attenuation (they lack the operational
 * group perms), which is the intended manager-centric flow.
 */
export class AssignGroupManager {
  constructor(
    private readonly groups: GroupRepository,
    private readonly members: GroupMemberRepository,
    private readonly grants: GrantRepository,
    private readonly access: AccessControl,
  ) {}

  async execute(cmd: AssignGroupManagerCommand): Promise<{ id: string }> {
    const group = await this.groups.findById(cmd.groupId);
    if (!group) throw new GroupNotFoundError(cmd.groupId);

    const member = await this.members.find(cmd.groupId, cmd.userId);
    if (!member || !member.isApproved) throw new MemberNotFoundError();

    const actorPermissions = await this.access.effectivePermissions(
      cmd.actor,
      groupScopeChain(group),
    );
    if (!actorPermissions.has('role:grant')) {
      throw new GroupAccessDeniedError('role:grant');
    }
    const escalated = permissionsForRole(MANAGER_ROLE).filter(
      (p) => !actorPermissions.has(p),
    );
    if (escalated.length > 0) {
      throw new GroupPrivilegeEscalationError(escalated);
    }

    const grant = Grant.create({
      id: randomUUID(),
      principalId: cmd.userId,
      roleId: MANAGER_ROLE,
      scope: ScopeRef.group(group.id),
      grantedByPrincipalId: cmd.actor.principalId,
    });
    await this.grants.save(grant);
    return { id: grant.id };
  }
}
