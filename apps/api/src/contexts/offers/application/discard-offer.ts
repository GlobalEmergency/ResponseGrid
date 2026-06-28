import { OfferRepository } from '../domain/ports/offer.repository';
import { EventBus } from '../domain/ports/event-bus';
import { OfferId } from '../domain/offer-id';
import { OfferNotFoundError } from './offer-not-found.error';
import { MutationAuditResult } from '../../../shared/domain/mutation-audit';

export interface DiscardOfferCommand {
  offerId: string;
}

/**
 * Discard a donation offer: it transitions to `cancelled` and leaves the queue.
 * The HTTP layer records the mandatory reason in the audit trail.
 */
export class DiscardOffer {
  constructor(
    private readonly repo: OfferRepository,
    private readonly bus: EventBus,
  ) {}

  async execute(cmd: DiscardOfferCommand): Promise<MutationAuditResult> {
    const offer = await this.repo.findById(OfferId.fromString(cmd.offerId));
    if (!offer) throw new OfferNotFoundError(cmd.offerId);

    const before = offer.status;
    offer.cancel();
    await this.repo.save(offer);
    await this.bus.publish(offer.pullDomainEvents());

    return {
      emergencyId: offer.emergencyId.value,
      changes: [{ field: 'status', before, after: offer.status }],
      targetStatus: offer.status,
    };
  }
}
