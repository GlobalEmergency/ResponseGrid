import { Need } from '../domain/need';
import { LocationProps } from '../../../shared/domain/location';
import { NeedItemSnapshot } from '../domain/need-item';
import { LocationSensitivity } from '../../../shared/domain/location-sensitivity';
import { approximateLocation } from '../../../shared/domain/approximate-location';
import { PersonnelSkill } from '../domain/need-enums';

export interface NeedView {
  id: string;
  emergencyId: string;
  title: string;
  description: string | null;
  location: LocationProps;
  locationSensitivity: LocationSensitivity;
  priority: string;
  requesterOrganizationId: string | null;
  managingOrganizationId: string | null;
  items: NeedItemSnapshot[];
  status: string;
  createdAt: string;
  expiresAt: string | null;
  lastVerifiedAt: string | null;
  /** F05: personnel-need fields — skillSpecialty omitted from public view */
  requiredSkill: PersonnelSkill | null;
  requestedCount: number | null;
  /** Optional link to the resource / final recipient (#60). */
  resourceId: string | null;
}

/** F05: Coordinator view includes the sensitive skillSpecialty field */
export interface CoordinatorNeedView extends NeedView {
  skillSpecialty: string | null;
}

/**
 * Map a Need to a public NeedView.
 *
 * When locationSensitivity is 'approximate', the coordinates exposed in the
 * response are jittered deterministically (seed = needId) so that:
 * - The same need always returns the same approximate point (no correlation).
 * - The exact position of individual requesters is never exposed publicly.
 *
 * The domain aggregate always stores exact coordinates internally.
 */
export function toPublicNeedView(n: Need): NeedView {
  const exactLocation = n.location.toPlain();

  let publicLocation: LocationProps;
  if (n.locationSensitivity === LocationSensitivity.Approximate) {
    const approx = approximateLocation(
      exactLocation.latitude,
      exactLocation.longitude,
      n.id.value,
    );
    publicLocation = {
      address: exactLocation.address,
      latitude: approx.lat,
      longitude: approx.lng,
    };
  } else {
    publicLocation = exactLocation;
  }

  return {
    id: n.id.value,
    emergencyId: n.emergencyId.value,
    title: n.title,
    description: n.description,
    location: publicLocation,
    locationSensitivity: n.locationSensitivity,
    priority: n.priority,
    requesterOrganizationId: n.requesterOrganizationId,
    managingOrganizationId: n.managingOrganizationId,
    items: n.items.map((i) => i.toSnapshot()),
    status: n.status,
    createdAt: n.createdAt.toISOString(),
    expiresAt: n.expiresAt ? n.expiresAt.toISOString() : null,
    lastVerifiedAt: n.lastVerifiedAt ? n.lastVerifiedAt.toISOString() : null,
    // skillSpecialty deliberately excluded from public view (sensitive)
    requiredSkill: n.requiredSkill,
    requestedCount: n.requestedCount,
    resourceId: n.resourceId,
  };
}

/**
 * Map a Need to a coordinator NeedView.
 *
 * Coordinators always receive exact coordinates regardless of sensitivity
 * level — they need the real address to dispatch volunteers.
 */
export function toCoordinatorNeedView(n: Need): CoordinatorNeedView {
  return {
    id: n.id.value,
    emergencyId: n.emergencyId.value,
    title: n.title,
    description: n.description,
    location: n.location.toPlain(),
    locationSensitivity: n.locationSensitivity,
    priority: n.priority,
    requesterOrganizationId: n.requesterOrganizationId,
    managingOrganizationId: n.managingOrganizationId,
    items: n.items.map((i) => i.toSnapshot()),
    status: n.status,
    createdAt: n.createdAt.toISOString(),
    expiresAt: n.expiresAt ? n.expiresAt.toISOString() : null,
    lastVerifiedAt: n.lastVerifiedAt ? n.lastVerifiedAt.toISOString() : null,
    requiredSkill: n.requiredSkill,
    skillSpecialty: n.skillSpecialty,
    requestedCount: n.requestedCount,
    resourceId: n.resourceId,
  };
}

/**
 * @deprecated Use toPublicNeedView or toCoordinatorNeedView instead.
 * Kept for backwards compatibility with use cases that have not yet been
 * updated to differentiate between public and coordinator views.
 * Defaults to coordinator view (exact coordinates).
 */
export function toNeedView(n: Need): CoordinatorNeedView {
  return toCoordinatorNeedView(n);
}
