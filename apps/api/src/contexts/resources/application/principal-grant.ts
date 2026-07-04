/**
 * A grant as it reaches the resource use cases. The controller maps identity's
 * `GrantSnapshot` down to this minimal shape so the application layer never
 * imports the identity context — only the fields needed to resolve resource
 * entity scope are kept.
 */
export interface PrincipalGrant {
  roleId: string;
  scope: { type: string; entityType?: string; id?: string };
  expiresAt: string | null;
}

/**
 * The single reusable definition of "which resources this principal manages
 * through a grant": the ids of every ACTIVE entity-scoped grant whose entity
 * is a resource. Shared by {@link GetMyManagedResources} (panel visibility,
 * #285) and `loadResourceForManagement` (the inventory/status gate, #316) so a
 * point that lists in the panel is exactly a point the principal can operate.
 *
 * Ownership and emergency-coordinator authority are NOT part of this set — each
 * caller checks those separately. The role is irrelevant here: any entity grant
 * on the resource surfaces it. Today the only role that emits such grants
 * (`point_manager`) also carries `resource:edit`, so an entity grant implies
 * full management; the day a read-only entity role appears, split read vs write
 * HERE — this is the one place the three surfaces agree on (issue #316, note c).
 */
export function grantedResourceIds(
  grants: PrincipalGrant[],
  now: Date,
): Set<string> {
  const ids = new Set<string>();
  for (const g of grants) {
    if (g.scope.type !== 'entity' || g.scope.entityType !== 'resource') {
      continue;
    }
    const scopeId = g.scope.id;
    if (scopeId == null || scopeId === '') continue;
    if (
      g.expiresAt != null &&
      new Date(g.expiresAt).getTime() <= now.getTime()
    ) {
      continue;
    }
    ids.add(scopeId);
  }
  return ids;
}
