import { OfferRepository } from '../domain/ports/offer.repository';
import { OfferView, toOfferView } from './offer-view';

export interface ListOffersForNeedQuery {
  needId: string;
}

export class ListOffersForNeed {
  constructor(private readonly repo: OfferRepository) {}

  async execute(q: ListOffersForNeedQuery): Promise<OfferView[]> {
    const offers = await this.repo.findByMatchedNeedId(q.needId);
    return offers.map(toOfferView);
  }
}
