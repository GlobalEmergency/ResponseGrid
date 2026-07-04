import { Resource } from '../domain/resource';
import { ResourceRepository } from '../domain/ports/resource.repository';
import { ResourceMembershipReader } from '../domain/ports/membership-reader';
import { ResourceId } from '../domain/resource-id';
import { ResourceNotFoundError } from './resource-not-found.error';
import { PrincipalGrant, grantedResourceIds } from './principal-grant';

/**
 * Shared management gate for the resource self-management use cases (public
 * status, declared inventory). Loads the resource — absent id maps to 404 — and
 * returns it when the requester (in priority order) owns it, holds an active
 * entity-scoped grant on it (e.g. `point_manager`, #316) or is a coordinator of
 * its emergency; otherwise throws the caller's `makeForbidden` error, so each
 * feature keeps its own 403 type in the HTTP exception mapping.
 *
 * The entity-grant check uses the SAME definition the `/resources/mine` panel
 * lists by ({@link grantedResourceIds}), so a point that shows in the panel is a
 * point its manager can actually operate. It runs before the coordinator lookup
 * because the grants already travel on the request (no I/O), so the dominant
 * owner and point-manager paths never hit the membership table. An owner who is
 * also a member of the ownerOrganization satisfies `isOwner`.
 */
export async function loadResourceForManagement(params: {
  repo: ResourceRepository;
  membershipReader: ResourceMembershipReader;
  resourceId: string;
  requesterUserId: string;
  grants?: PrincipalGrant[];
  now?: Date;
  makeForbidden: () => Error;
}): Promise<Resource> {
  const resource = await params.repo.findById(
    ResourceId.fromString(params.resourceId),
  );
  if (!resource) throw new ResourceNotFoundError(params.resourceId);

  if (resource.ownerUserId === params.requesterUserId) return resource;

  const granted = grantedResourceIds(
    params.grants ?? [],
    params.now ?? new Date(),
  );
  if (granted.has(resource.id.value)) return resource;

  const isCoordinator = await params.membershipReader.isCoordinator(
    params.requesterUserId,
    resource.emergencyId.value,
  );
  if (!isCoordinator) throw params.makeForbidden();
  return resource;
}
