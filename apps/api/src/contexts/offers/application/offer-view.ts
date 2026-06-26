import { DonationOffer } from '../domain/donation-offer';
import { LocationProps } from '../../../shared/domain/location';

export interface OfferView {
  id: string;
  emergencyId: string;
  donorUserId: string;
  donorOrganizationId: string | null;
  category: string;
  description: string;
  quantity: number;
  unit: string | null;
  location: LocationProps;
  targetNeedId: string | null;
  matchedNeedId: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toOfferView(o: DonationOffer): OfferView {
  return {
    id: o.id.value,
    emergencyId: o.emergencyId.value,
    donorUserId: o.donorUserId,
    donorOrganizationId: o.donorOrganizationId,
    category: o.category,
    description: o.description,
    quantity: o.quantity,
    unit: o.unit,
    location: o.location.toPlain(),
    targetNeedId: o.targetNeedId,
    matchedNeedId: o.matchedNeedId,
    status: o.status,
    notes: o.notes,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}
