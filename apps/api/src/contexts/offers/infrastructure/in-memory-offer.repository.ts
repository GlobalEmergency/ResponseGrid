import { OfferRepository } from '../domain/ports/offer.repository';
import { DonationOffer, DonationOfferSnapshot } from '../domain/donation-offer';
import { OfferId } from '../domain/offer-id';
import { EmergencyId } from '../../../shared/domain/emergency-id';
import { OfferStatus } from '../domain/offer-enums';

export class InMemoryOfferRepository implements OfferRepository {
  private store = new Map<string, DonationOfferSnapshot>();

  save(offer: DonationOffer): Promise<void> {
    this.store.set(offer.id.value, offer.toSnapshot());
    return Promise.resolve();
  }

  findById(id: OfferId): Promise<DonationOffer | null> {
    const snap = this.store.get(id.value);
    return Promise.resolve(snap ? DonationOffer.fromSnapshot(snap) : null);
  }

  findByEmergencyAndStatus(
    emergencyId: EmergencyId,
    status: OfferStatus,
  ): Promise<DonationOffer[]> {
    const result = [...this.store.values()]
      .filter((s) => s.emergencyId === emergencyId.value && s.status === status)
      .map((s) => DonationOffer.fromSnapshot(s));
    return Promise.resolve(result);
  }

  findByMatchedNeedId(needId: string): Promise<DonationOffer[]> {
    const result = [...this.store.values()]
      .filter((s) => s.matchedNeedId === needId)
      .map((s) => DonationOffer.fromSnapshot(s));
    return Promise.resolve(result);
  }

  findByDonorAndEmergency(
    donorUserId: string,
    emergencyId: EmergencyId,
  ): Promise<DonationOffer[]> {
    const result = [...this.store.values()]
      .filter(
        (s) =>
          s.donorUserId === donorUserId && s.emergencyId === emergencyId.value,
      )
      .map((s) => DonationOffer.fromSnapshot(s));
    return Promise.resolve(result);
  }

  findOpenByEmergencyAndCategory(
    emergencyId: EmergencyId,
    category: string,
  ): Promise<DonationOffer[]> {
    const result = [...this.store.values()]
      .filter(
        (s) =>
          s.emergencyId === emergencyId.value &&
          s.status === OfferStatus.Open &&
          s.items.some((i) => (i.category as string) === category),
      )
      .map((s) => DonationOffer.fromSnapshot(s));
    return Promise.resolve(result);
  }
}
