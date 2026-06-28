import { GroupRepository } from '../domain/ports/group.repository';
import { GroupSnapshot } from '../domain/group';
import { GroupOwnerScope } from '../domain/group-enums';
import {
  AccessControl,
  AuthorizationContext,
} from '../../identity/domain/authorization/access-control';
import { ownerScopeChain } from './group-scope';

export interface ListGroupsByOwnerQuery {
  actor: AuthorizationContext;
  owner: GroupOwnerScope;
}

/**
 * List the groups under an organization/emergency. A principal who can
 * `group:read` there sees **all** of them (manager/admin view); everyone else
 * sees only the **public** ones — enough to discover a group to request to
 * join, without leaking private cuadrillas.
 */
export class ListGroupsByOwner {
  constructor(
    private readonly groups: GroupRepository,
    private readonly access: AccessControl,
  ) {}

  async execute(query: ListGroupsByOwnerQuery): Promise<GroupSnapshot[]> {
    const canReadAll = await this.access.can(query.actor, 'group:read', {
      scopeChain: ownerScopeChain(query.owner),
    });
    const groups = await this.groups.listByOwner(query.owner);
    const visible = canReadAll ? groups : groups.filter((g) => g.isPublic);
    return visible.map((g) => g.toSnapshot());
  }
}
