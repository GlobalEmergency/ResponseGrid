import { DonationOffer } from '../domain/donation-offer';
import { LocationProps } from '../../../shared/domain/location';
import { SupplyLineSnapshot } from '../../supplies/domain/supply-line';
import { AuthorSnapshot } from '../../../shared/domain/author';

export interface OfferView {
  id: string;
  emergencyId: string;
  donorUserId: string;
  donorOrganizationId: string | null;
  items: SupplyLineSnapshot[];
  location: LocationProps;
  targetNeedId: string | null;
  matchedNeedId: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  /**
   * Restricted author attribution (#235). Offers have no public read — every
   * OfferView consumer is coordinator- or owner-gated — so it is safe to carry
   * the contact here.
   */
  author: AuthorSnapshot | null;
}

export function toOfferView(o: DonationOffer): OfferView {
  return {
    id: o.id.value,
    emergencyId: o.emergencyId.value,
    donorUserId: o.donorUserId,
    donorOrganizationId: o.donorOrganizationId,
    items: o.items.map((i) => i.toSnapshot()),
    location: o.location.toPlain(),
    targetNeedId: o.targetNeedId,
    matchedNeedId: o.matchedNeedId,
    status: o.status,
    notes: o.notes,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    author: o.author ? o.author.toSnapshot() : null,
  };
}
