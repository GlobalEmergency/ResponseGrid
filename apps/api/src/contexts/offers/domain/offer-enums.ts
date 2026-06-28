// Offers share the single Category taxonomy owned by the supplies context
// (kept under the `NeedCategory` alias to avoid churn in the offers context).
import { Category as NeedCategory } from '../../supplies/domain/category';

export { NeedCategory };

export enum OfferStatus {
  Open = 'open',
  Matched = 'matched',
  Fulfilled = 'fulfilled',
  Cancelled = 'cancelled',
}
