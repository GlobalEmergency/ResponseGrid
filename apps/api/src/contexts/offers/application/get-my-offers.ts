import { OfferRepository } from '../domain/ports/offer.repository';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { OfferView, toOfferView } from './offer-view';

export interface GetMyOffersQuery {
  emergencyId: string;
  userId: string;
}

export class GetMyOffers {
  constructor(private readonly repo: OfferRepository) {}

  async execute(q: GetMyOffersQuery): Promise<OfferView[]> {
    const offers = await this.repo.findByDonorAndEmergency(
      q.userId,
      EmergencyId.fromString(q.emergencyId),
    );
    return offers.map(toOfferView);
  }
}
