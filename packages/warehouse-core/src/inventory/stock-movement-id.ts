import { randomUUID } from 'node:crypto';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Identity of a {@link StockMovement} — one immutable line of the stock ledger
 * (kardex). A UUID value object; the ledger is append-only, so an id is minted
 * once and never reused.
 */
export class StockMovementId {
  private constructor(public readonly value: string) {}

  static create(): StockMovementId {
    return new StockMovementId(randomUUID());
  }

  static fromString(s: string): StockMovementId {
    if (!UUID_RE.test(s)) throw new Error(`Invalid StockMovementId: ${s}`);
    return new StockMovementId(s);
  }

  equals(o: StockMovementId): boolean {
    return this.value === o.value;
  }
}
