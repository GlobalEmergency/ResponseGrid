import { OfferRepository } from '../domain/ports/offer.repository';
import { NeedLookup } from '../domain/ports/need-lookup';
import { OfferView, toOfferView } from './offer-view';
import { DonationOffer } from '../domain/donation-offer';
import { EmergencyId } from '../../../shared/domain/emergency-id';
export class NeedForSuggestNotFoundError extends Error {
  constructor(needId: string) {
    super(`Need not found: ${needId}`);
    this.name = 'NeedForSuggestNotFoundError';
  }
}

export interface SuggestOffersForNeedQuery {
  needId: string;
  /** Emergency id is resolved by the caller (guard or controller) */
  emergencyId: string;
  /** Location of the need for proximity sort */
  needLatitude: number;
  needLongitude: number;
}

/** Euclidean distance on lat/lng — sufficient for relative sorting within a region. */
function euclideanDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dlat = lat1 - lat2;
  const dlon = lon1 - lon2;
  return Math.sqrt(dlat * dlat + dlon * dlon);
}

/** Accepts need location for proximity sorting */
export class SuggestOffersForNeedWithLocation {
  constructor(
    private readonly offerRepo: OfferRepository,
    private readonly needLookup: NeedLookup,
  ) {}

  async execute(query: SuggestOffersForNeedQuery): Promise<OfferView[]> {
    const category = await this.needLookup.findCategory(query.needId);
    if (category === null) {
      throw new NeedForSuggestNotFoundError(query.needId);
    }

    const openOffers = await this.offerRepo.findOpenByEmergencyAndCategory(
      EmergencyId.fromString(query.emergencyId),
      category,
    );

    const sorted = openOffers
      .slice()
      .sort((a: DonationOffer, b: DonationOffer) => {
        const da = euclideanDistance(
          query.needLatitude,
          query.needLongitude,
          a.location.latitude,
          a.location.longitude,
        );
        const db = euclideanDistance(
          query.needLatitude,
          query.needLongitude,
          b.location.latitude,
          b.location.longitude,
        );
        return da - db;
      });

    return sorted.map(toOfferView);
  }
}
