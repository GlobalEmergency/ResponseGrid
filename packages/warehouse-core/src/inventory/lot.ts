import { StockValidationError } from './stock-errors.js';

/**
 * A batch of material: a lot/batch code and its optional expiry. Immutable
 * value object embedded in a {@link StockItem}. The expiry is what FEFO
 * (first-expired-first-out) allocation reads; a lot with no expiry never
 * expires. Stock that is not lot-tracked carries no `Lot` at all (the item's
 * lot is `null`) rather than a `Lot` with an empty code.
 */
export class Lot {
  private constructor(
    public readonly code: string,
    public readonly expiresAt: Date | null,
  ) {}

  static of(code: string, expiresAt: Date | null = null): Lot {
    const normalized = typeof code === 'string' ? code.trim() : '';
    if (normalized.length === 0) {
      throw new StockValidationError('Lot code must not be empty');
    }
    return new Lot(normalized, expiresAt);
  }

  /** True when the lot has an expiry at or before the given instant. */
  isExpiredAt(instant: Date): boolean {
    return (
      this.expiresAt !== null && this.expiresAt.getTime() <= instant.getTime()
    );
  }

  equals(o: Lot): boolean {
    const sameExpiry =
      (this.expiresAt === null && o.expiresAt === null) ||
      (this.expiresAt !== null &&
        o.expiresAt !== null &&
        this.expiresAt.getTime() === o.expiresAt.getTime());
    return this.code === o.code && sameExpiry;
  }
}
