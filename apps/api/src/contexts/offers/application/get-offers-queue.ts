import { OfferRepository } from '../domain/ports/offer.repository';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { OfferStatus } from '../domain/offer-enums';
import { OfferView, toOfferView } from './offer-view';

export interface GetOffersQueueQuery {
  emergencyId: string;
}

export class GetOffersQueue {
  constructor(private readonly repo: OfferRepository) {}

  async execute(q: GetOffersQueueQuery): Promise<OfferView[]> {
    const offers = await this.repo.findByEmergencyAndStatus(
      EmergencyId.fromString(q.emergencyId),
      OfferStatus.Open,
    );
    return offers.map(toOfferView);
  }
}
