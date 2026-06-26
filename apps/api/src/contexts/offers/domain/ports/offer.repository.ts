import { DonationOffer } from '../donation-offer';
import { OfferId } from '../offer-id';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import { OfferStatus } from '../offer-enums';

export const OFFER_REPOSITORY = Symbol('OfferRepository');

export interface OfferRepository {
  save(offer: DonationOffer): Promise<void>;
  findById(id: OfferId): Promise<DonationOffer | null>;
  findByEmergencyAndStatus(
    emergencyId: EmergencyId,
    status: OfferStatus,
  ): Promise<DonationOffer[]>;
  findByMatchedNeedId(needId: string): Promise<DonationOffer[]>;
  findByDonorAndEmergency(
    donorUserId: string,
    emergencyId: EmergencyId,
  ): Promise<DonationOffer[]>;
  findOpenByEmergencyAndCategory(
    emergencyId: EmergencyId,
    category: string,
  ): Promise<DonationOffer[]>;
}
