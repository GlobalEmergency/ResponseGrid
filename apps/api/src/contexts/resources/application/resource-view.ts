import { Resource } from '../domain/resource';
import {
  ResourceType,
  VerificationLevel,
  PublicStatus,
} from '../domain/resource-enums';
import { LocationProps } from '../../../shared/domain/location';
import { Category } from '../../supplies/domain/category';

export interface ResourceView {
  id: string;
  type: ResourceType;
  name: string;
  description: string | null;
  location: LocationProps;
  verificationLevel: VerificationLevel;
  publicStatus: PublicStatus;
  ownerOrganizationId: string | null;
  // enriched fields
  accepts: string[];
  contact: string | null;
  /**
   * Whether the resource has a contact on file, independent of whether
   * `contact` is revealed to this caller. Lets the public UI show a
   * "log in to see it" hint instead of "no contact" once `contact` is
   * redacted for anonymous callers. See {@link redactContact}.
   */
  hasContact: boolean;
  schedule: string | null;
  manager: string | null;
  sourceName: string | null;
  externalUpdatedAt: string | null; // ISO string
  /** Country string from the source's `pais` field — often a full Spanish name (e.g. "Venezuela"), NOT an ISO code. */
  country: string | null;
  city: string | null;
  // destinatario final (#60)
  isFinalRecipient: boolean;
  recipientType: string | null;
  // validez reportada por ciudadanos (ficha 15)
  disputed: boolean;
  disputedAt: string | null; // ISO 8601, or null
}

/**
 * Detail view: the base view plus an AGGREGATED view of the place's declared
 * inventory — only the distinct categories present, never names/quantities.
 *
 * Privacy: the public detail endpoint is anonymous, so it must not broadcast a
 * place's exact stock (quantities + product names) next to its exact address —
 * that turns a warehouse/recipient into a theft/looting target in an emergency
 * (cf. F09 location privacy). Coordination tooling can surface the full
 * SupplyLine detail later, behind permissions. Only the single-resource
 * endpoint returns this; list/map views use the lighter ResourceView.
 */
export interface ResourceDetailView extends ResourceView {
  inventoryCategories: Category[];
}

export function toResourceView(r: Resource): ResourceView {
  return {
    id: r.id.value,
    type: r.type,
    name: r.name,
    description: r.description,
    location: r.location.toPlain(),
    verificationLevel: r.verificationLevel,
    publicStatus: r.publicStatus,
    ownerOrganizationId: r.ownerOrganizationId,
    accepts: r.accepts,
    contact: r.contact,
    hasContact: r.contact != null,
    schedule: r.schedule,
    manager: r.manager,
    sourceName: r.provenance?.sourceName ?? null,
    externalUpdatedAt: r.provenance?.externalUpdatedAt?.toISOString() ?? null,
    country: r.country,
    city: r.city,
    isFinalRecipient: r.isFinalRecipient,
    recipientType: r.recipientType,
    disputed: r.disputed,
    disputedAt: r.disputedAt ? r.disputedAt.toISOString() : null,
  };
}

export function toResourceDetailView(r: Resource): ResourceDetailView {
  // Aggregate to the distinct categories present (deduplicated), dropping
  // names/quantities/presentation — see ResourceDetailView for the rationale.
  return {
    ...toResourceView(r),
    inventoryCategories: [...new Set(r.items.map((i) => i.category))],
  };
}
