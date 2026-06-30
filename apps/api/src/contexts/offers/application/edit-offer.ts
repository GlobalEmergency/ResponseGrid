import { OfferRepository } from '../domain/ports/offer.repository';
import { OfferId } from '../domain/offer-id';
import { EditOfferProps } from '../domain/donation-offer';
import { Category } from '../domain/offer-enums';
import {
  SupplyLine,
  SupplyLineSnapshot,
} from '../../supplies/domain/supply-line';
import { OfferNotFoundError } from './offer-not-found.error';
import {
  MutationAuditResult,
  diffFields,
} from '../../../shared/domain/mutation-audit';

export interface EditOfferItemCommand {
  name: string;
  quantity: number;
  unit: string | null;
  category: Category;
  presentation: string | null;
  supplyId?: string | null;
}

export interface EditOfferCommand {
  offerId: string;
  /** Replaces the whole list of supply lines when provided. */
  items?: EditOfferItemCommand[];
  notes?: string | null;
}

/** Stable string form of the lines so the audit diff compares by value. */
function serializeItems(
  items: readonly { toSnapshot(): SupplyLineSnapshot }[],
) {
  return JSON.stringify(items.map((i) => i.toSnapshot()));
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
      items: serializeItems(offer.items),
      notes: offer.notes,
    };

    const edit: EditOfferProps = {};
    if (cmd.items !== undefined) {
      edit.items = cmd.items.map((i) =>
        SupplyLine.create({
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          category: i.category,
          presentation: i.presentation,
          supplyId: i.supplyId ?? null,
        }),
      );
    }
    if (cmd.notes !== undefined) edit.notes = cmd.notes;
    offer.edit(edit);

    const after = {
      items: serializeItems(offer.items),
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
