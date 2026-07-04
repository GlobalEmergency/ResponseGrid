import {
  ManagedResourceRow,
  ResourceRepository,
} from '../domain/ports/resource.repository';
import { PrincipalGrant, grantedResourceIds } from './principal-grant';

/**
 * One resource the principal manages, reduced to what the app shell needs to
 * list and link it (issue #285). Deliberately NOT the full ResourceView: this
 * backs a navigation surface, so it carries no address/contact/inventory.
 * Same shape the repository already projects (#318) — aliased so the HTTP
 * layer keeps depending on an application type, not on the port directly.
 */
export type MyManagedResourceView = ManagedResourceRow;

// Re-exported so existing importers keep resolving `PrincipalGrant` from here;
// the type and its resource-scope filter now live in ./principal-grant, shared
// with the inventory/status gate (issue #316).
export type { PrincipalGrant } from './principal-grant';

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
    return this.repo.findOwnedOrGranted(userId, [
      ...grantedResourceIds(grants, now),
    ]);
  }
}
