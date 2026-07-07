import {
  QuantityUnitMismatchError,
  StockValidationError,
} from './stock-errors.js';

/**
 * Decimal scale for stored amounts. Amounts are rounded to 6 decimal places on
 * every construction and arithmetic step, which keeps a `numeric(18,6)` column
 * and float arithmetic in agreement and neutralizes binary-float drift
 * (`0.1 + 0.2`). Six places covers grams/millilitres without surprises.
 */
const SCALE = 6;
const FACTOR = 10 ** SCALE;

function round(amount: number): number {
  // +0 avoids a signed negative zero leaking into snapshots/equality.
  return Math.round(amount * FACTOR) / FACTOR + 0;
}

/**
 * A measured amount of material in a single unit of measure — the decimal
 * quantity of a {@link StockItem}. Immutable value object: arithmetic returns a
 * new `Quantity` and never mutates. Units are opaque strings (e.g. `unit`,
 * `kg`, `l`, `box`), normalized to trimmed lowercase; combining two quantities
 * requires the same unit (no unit conversion here). Amounts are non-negative
 * and rounded to 6 decimals.
 */
export class Quantity {
  private constructor(
    public readonly amount: number,
    public readonly unit: string,
  ) {}

  static of(amount: number, unit: string): Quantity {
    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
      throw new StockValidationError('Quantity amount must be a finite number');
    }
    if (amount < 0) {
      throw new StockValidationError('Quantity amount must not be negative');
    }
    const normalizedUnit = typeof unit === 'string' ? unit.trim() : '';
    if (normalizedUnit.length === 0) {
      throw new StockValidationError('Quantity unit must not be empty');
    }
    return new Quantity(round(amount), normalizedUnit.toLowerCase());
  }

  plus(o: Quantity): Quantity {
    this.assertSameUnit(o);
    return Quantity.of(this.amount + o.amount, this.unit);
  }

  /** Subtracts, throwing {@link StockValidationError} if the result is negative. */
  minus(o: Quantity): Quantity {
    this.assertSameUnit(o);
    return Quantity.of(round(this.amount - o.amount), this.unit);
  }

  isZero(): boolean {
    return this.amount === 0;
  }

  isLessThan(o: Quantity): boolean {
    this.assertSameUnit(o);
    return this.amount < o.amount;
  }

  equals(o: Quantity): boolean {
    return this.amount === o.amount && this.unit === o.unit;
  }

  private assertSameUnit(o: Quantity): void {
    if (this.unit !== o.unit) {
      throw new QuantityUnitMismatchError(
        `Cannot combine quantities of "${this.unit}" and "${o.unit}"`,
      );
    }
  }
}
