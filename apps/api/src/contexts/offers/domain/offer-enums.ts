// Offers share the single Category taxonomy owned by the supplies context.
import { Category } from '@globalemergency/warehouse-core/kernel';

export { Category };

export enum OfferStatus {
  Open = 'open',
  Matched = 'matched',
  Fulfilled = 'fulfilled',
  Cancelled = 'cancelled',
}
