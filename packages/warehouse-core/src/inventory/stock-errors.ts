/**
 * Raised on invalid stock input: negative/NaN quantity, empty unit or lot code,
 * empty supply/bin id. The HTTP layer of each host maps it to 422.
 */
export class StockValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StockValidationError';
  }
}

/**
 * Raised when an arithmetic or comparison mixes two {@link Quantity} values of
 * different units (kg vs unit…). Quantities are only combinable within one unit
 * of measure; converting between units is out of scope for the aggregate.
 */
export class QuantityUnitMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuantityUnitMismatchError';
  }
}

/**
 * Raised when decreasing a {@link StockItem} by more than it holds. Stock can
 * never go negative; the HTTP layer maps this to 409 Conflict.
 */
export class InsufficientStockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientStockError';
  }
}
