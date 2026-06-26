import { OfferRepository } from '../domain/ports/offer.repository';
import { EventBus } from '../domain/ports/event-bus';
import { OfferId } from '../domain/offer-id';
import { OfferNotFoundError } from './offer-not-found.error';

export class OfferCancelUnauthorizedError extends Error {
  constructor() {
    super('Only the offer owner or a coordinator can cancel an offer');
    this.name = 'OfferCancelUnauthorizedError';
  }
}

export interface CancelOfferCommand {
  offerId: string;
  requesterUserId: string;
  /** True when the requester is an admin or coordinator of the emergency */
  isCoordinator: boolean;
}

export class CancelOffer {
  constructor(
    private readonly repo: OfferRepository,
    private readonly bus: EventBus,
  ) {}

  async execute(cmd: CancelOfferCommand): Promise<void> {
    const offer = await this.repo.findById(OfferId.fromString(cmd.offerId));
    if (!offer) throw new OfferNotFoundError(cmd.offerId);

    if (!cmd.isCoordinator && offer.donorUserId !== cmd.requesterUserId) {
      throw new OfferCancelUnauthorizedError();
    }

    offer.cancel();
    await this.repo.save(offer);
    await this.bus.publish(offer.pullDomainEvents());
  }
}
