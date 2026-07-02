import { Resource } from '../domain/resource';
import { ResourceRepository } from '../domain/ports/resource.repository';
import { ResourceMembershipReader } from '../domain/ports/membership-reader';
import { ResourceId } from '../domain/resource-id';
import { ResourceNotFoundError } from './resource-not-found.error';

/**
 * Shared owner-or-coordinator gate for the resource self-management use cases
 * (public status, declared inventory). Loads the resource — absent id maps to
 * 404 — and returns it when the requester is its owner or a coordinator of its
 * emergency; otherwise throws the caller's `makeForbidden` error, so each
 * feature keeps its own 403 type in the HTTP exception mapping.
 *
 * The coordinator membership lookup only runs for NON-owners: the owner is the
 * dominant self-service path and needs no extra query. An owner who is also a
 * member of the ownerOrganization satisfies `isOwner`.
 */
export async function loadResourceForManagement(params: {
  repo: ResourceRepository;
  membershipReader: ResourceMembershipReader;
  resourceId: string;
  requesterUserId: string;
  makeForbidden: () => Error;
}): Promise<Resource> {
  const resource = await params.repo.findById(
    ResourceId.fromString(params.resourceId),
  );
  if (!resource) throw new ResourceNotFoundError(params.resourceId);

  const isOwner = resource.ownerUserId === params.requesterUserId;
  if (!isOwner) {
    const isCoordinator = await params.membershipReader.isCoordinator(
      params.requesterUserId,
      resource.emergencyId.value,
    );
    if (!isCoordinator) throw params.makeForbidden();
  }
  return resource;
}
