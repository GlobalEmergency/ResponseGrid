import { ScopeRefProps } from '../../identity/domain/authorization/scope-ref';
import { Group } from '../domain/group';
import { GroupOwnerScope } from '../domain/group-enums';

/** The owning organization/emergency expressed as an authorization scope. */
export function ownerScopeProps(owner: GroupOwnerScope): ScopeRefProps {
  return owner.kind === 'organization'
    ? { type: 'organization', id: owner.organizationId }
    : { type: 'emergency', id: owner.emergencyId };
}

/**
 * Ancestor chain for the *owner* of a not-yet-created group: `[owner, platform]`.
 * Used to gate `group:create`.
 */
export function ownerScopeChain(owner: GroupOwnerScope): ScopeRefProps[] {
  return [ownerScopeProps(owner), { type: 'platform' }];
}

/**
 * Ancestor chain for an existing group: `[group → owner → platform]`. This is
 * the three-level chain the generic `ancestorChain` cannot build (it does not
 * know a group's owner), so a grant held at the group **or** at its owning
 * org/emergency **or** at platform all cover the group. See docs/features/13 §6.
 */
export function groupScopeChain(group: Group): ScopeRefProps[] {
  return [
    { type: 'group', id: group.id },
    ownerScopeProps(group.ownerScope),
    { type: 'platform' },
  ];
}
