import { OfferRepository } from '../domain/ports/offer.repository';
import { EventBus } from '../domain/ports/event-bus';
import { OfferId } from '../domain/offer-id';
import { OfferNotFoundError } from './offer-not-found.error';

export class OfferNeedEmergencyMismatchError extends Error {
  constructor(offerId: string, needId: string) {
    super(
      `Offer '${offerId}' and need '${needId}' do not belong to the same emergency`,
    );
    this.name = 'OfferNeedEmergencyMismatchError';
  }
}

export interface MatchOfferCommand {
  offerId: string;
  needId: string;
  /** Emergency id that owns the need — resolved by the coordinator guard lookup */
  needEmergencyId: string;
}

export class MatchOffer {
  constructor(
    private readonly repo: OfferRepository,
    private readonly bus: EventBus,
  ) {}

  async execute(cmd: MatchOfferCommand): Promise<void> {
    const offer = await this.repo.findById(OfferId.fromString(cmd.offerId));
    if (!offer) throw new OfferNotFoundError(cmd.offerId);

    if (offer.emergencyId.value !== cmd.needEmergencyId) {
      throw new OfferNeedEmergencyMismatchError(cmd.offerId, cmd.needId);
    }

    offer.matchTo(cmd.needId);
    await this.repo.save(offer);
    await this.bus.publish(offer.pullDomainEvents());
  }
}
