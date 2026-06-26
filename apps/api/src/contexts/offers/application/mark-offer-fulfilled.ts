import { OfferRepository } from '../domain/ports/offer.repository';
import { EventBus } from '../domain/ports/event-bus';
import { OfferId } from '../domain/offer-id';
import { OfferNotFoundError } from './offer-not-found.error';

export interface MarkOfferFulfilledCommand {
  offerId: string;
}

export class MarkOfferFulfilled {
  constructor(
    private readonly repo: OfferRepository,
    private readonly bus: EventBus,
  ) {}

  async execute(cmd: MarkOfferFulfilledCommand): Promise<void> {
    const offer = await this.repo.findById(OfferId.fromString(cmd.offerId));
    if (!offer) throw new OfferNotFoundError(cmd.offerId);

    offer.markFulfilled();
    await this.repo.save(offer);
    await this.bus.publish(offer.pullDomainEvents());
  }
}
