import { randomUUID } from 'node:crypto';
import { GroupRepository } from '../domain/ports/group.repository';
import { Group } from '../domain/group';
import { GroupVisibility, GroupOwnerScope } from '../domain/group-enums';
import { GroupAccessDeniedError } from '../domain/errors';
import { GrantRepository } from '../../identity/domain/ports/grant.repository';
import {
  AccessControl,
  AuthorizationContext,
} from '../../identity/domain/authorization/access-control';
import { Grant } from '../../identity/domain/authorization/grant';
import { ScopeRef } from '../../identity/domain/authorization/scope-ref';
import { ownerScopeChain } from './group-scope';

export interface CreateGroupCommand {
  actor: AuthorizationContext;
  name: string;
  visibility: GroupVisibility;
  ownerScope: GroupOwnerScope;
  parentGroupId?: string | null;
}

/**
 * Create a group and make the creator its first manager.
 *
 * Gate: `group:create` at the owning org/emergency. The bootstrap grant
 * (`group_manager @ group:<id>` for the creator) is the *owner-on-create* path
 * — it deliberately bypasses delegation/attenuation, the same way creating a
 * resource makes you its owner. Every *subsequent* manager goes through the
 * attenuated `AssignGroupManager`. See docs/features/13 §5–§6.
 */
export class CreateGroup {
  constructor(
    private readonly groups: GroupRepository,
    private readonly grants: GrantRepository,
    private readonly access: AccessControl,
  ) {}

  async execute(cmd: CreateGroupCommand): Promise<{ id: string }> {
    const allowed = await this.access.can(cmd.actor, 'group:create', {
      scopeChain: ownerScopeChain(cmd.ownerScope),
    });
    if (!allowed) throw new GroupAccessDeniedError('group:create');

    const group = Group.create({
      id: randomUUID(),
      name: cmd.name,
      visibility: cmd.visibility,
      ownerScope: cmd.ownerScope,
      parentGroupId: cmd.parentGroupId ?? null,
    });
    await this.groups.save(group);

    const grant = Grant.create({
      id: randomUUID(),
      principalId: cmd.actor.principalId,
      roleId: 'group_manager',
      scope: ScopeRef.group(group.id),
      grantedByPrincipalId: cmd.actor.principalId,
    });
    await this.grants.save(grant);

    return { id: group.id };
  }
}
