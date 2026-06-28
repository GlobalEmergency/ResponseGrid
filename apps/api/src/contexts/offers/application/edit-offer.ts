import { OfferRepository } from '../domain/ports/offer.repository';
import { OfferId } from '../domain/offer-id';
import { EditOfferProps } from '../domain/donation-offer';
import { OfferNotFoundError } from './offer-not-found.error';
import {
  MutationAuditResult,
  diffFields,
} from '../../../shared/domain/mutation-audit';

export interface EditOfferCommand {
  offerId: string;
  description?: string;
  quantity?: number;
  unit?: string | null;
  notes?: string | null;
}

/**
 * Coordinator edit of a donation offer. Returns the before/after diff so the
 * HTTP layer can record it in the audit trail; the mandatory reason is captured
 * there. Status is unchanged (targetStatus null).
 */
export class EditOffer {
  constructor(private readonly repo: OfferRepository) {}

  async execute(cmd: EditOfferCommand): Promise<MutationAuditResult> {
    const offer = await this.repo.findById(OfferId.fromString(cmd.offerId));
    if (!offer) throw new OfferNotFoundError(cmd.offerId);

    const before = {
      description: offer.description,
      quantity: offer.quantity,
      unit: offer.unit,
      notes: offer.notes,
    };

    const edit: EditOfferProps = {};
    if (cmd.description !== undefined) edit.description = cmd.description;
    if (cmd.quantity !== undefined) edit.quantity = cmd.quantity;
    if (cmd.unit !== undefined) edit.unit = cmd.unit;
    if (cmd.notes !== undefined) edit.notes = cmd.notes;
    offer.edit(edit);

    const after = {
      description: offer.description,
      quantity: offer.quantity,
      unit: offer.unit,
      notes: offer.notes,
    };

    await this.repo.save(offer);

    return {
      emergencyId: offer.emergencyId.value,
      changes: diffFields(before, after),
      targetStatus: null,
    };
  }
}
