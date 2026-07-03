import { ResourceRepository } from '../domain/ports/resource.repository';
import { ResourceType } from '../domain/resource-enums';

/**
 * One resource the principal manages, reduced to what the app shell needs to
 * list and link it (issue #285). Deliberately NOT the full ResourceView: this
 * backs a navigation surface, so it carries no address/contact/inventory.
 */
export interface MyManagedResourceView {
  id: string;
  type: ResourceType;
  name: string;
  emergencyId: string;
  /** Null when the owning emergency row is missing. */
  emergencySlug: string | null;
}

/**
 * A grant as it reaches this use case — the controller passes the
 * already-resolved request grants (see {@link AuthenticatedUser}). Only the
 * fields needed to resolve resource entity scope are required.
 */
export interface PrincipalGrant {
  roleId: string;
  scope: { type: string; entityType?: string; id?: string };
  expiresAt: string | null;
}

/**
 * Lists the resources the authenticated principal manages, across every
 * emergency: the ones they own (`ownerUserId`) plus the ones reached through
 * an active entity-scoped grant on a resource (e.g. `point_manager`). This is
 * what `/emergencies/{id}/resources/mine` cannot answer for a principal whose
 * only grant is entity-scoped — they hold no emergency grant, so the emergency
 * to iterate is unknown (issue #285). Expired grants are ignored; the role is
 * irrelevant (any entity grant on the resource surfaces it).
 */
export class GetMyManagedResources {
  constructor(private readonly repo: ResourceRepository) {}

  async execute(
    userId: string,
    grants: PrincipalGrant[],
    now: Date = new Date(),
  ): Promise<MyManagedResourceView[]> {
    const grantedIds = new Set<string>();
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
      grantedIds.add(scopeId);
    }

    const rows = await this.repo.findOwnedOrGranted(userId, [...grantedIds]);
    return rows.map(({ resource, emergencySlug }) => ({
      id: resource.id.value,
      type: resource.type,
      name: resource.name,
      emergencyId: resource.emergencyId.value,
      emergencySlug,
    }));
  }
}
