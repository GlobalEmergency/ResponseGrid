import { Resource } from '../domain/resource';
import { LocationProps } from '../../../shared/domain/location';

export interface ResourceView {
  id: string;
  type: string;
  stage: string;
  name: string;
  description: string | null;
  location: LocationProps;
  verificationLevel: string;
  publicStatus: string;
  ownerOrganizationId: string | null;
  // enriched fields
  accepts: string[];
  contact: string | null;
  schedule: string | null;
  manager: string | null;
  sourceName: string | null;
  externalUpdatedAt: string | null; // ISO string
  country: string | null;
  city: string | null;
}

export function toResourceView(r: Resource): ResourceView {
  return {
    id: r.id.value,
    type: r.type,
    stage: r.stage,
    name: r.name,
    description: r.description,
    location: r.location.toPlain(),
    verificationLevel: r.verificationLevel,
    publicStatus: r.publicStatus,
    ownerOrganizationId: r.ownerOrganizationId,
    accepts: r.accepts,
    contact: r.contact,
    schedule: r.schedule,
    manager: r.manager,
    sourceName: r.provenance?.sourceName ?? null,
    externalUpdatedAt: r.provenance?.externalUpdatedAt?.toISOString() ?? null,
    country: r.country,
    city: r.city,
  };
}
