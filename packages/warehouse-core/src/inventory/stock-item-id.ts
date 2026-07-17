import { randomUUID } from 'node:crypto';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Identity of a {@link StockItem} — one row of existence at the grain
 * product × lot × bin × status. A UUID value object; the *business* grain key
 * (bin, supply, lot, status) is a separate unique constraint enforced by the
 * repository, so the surrogate id stays stable even as quantity changes.
 */
export class StockItemId {
  private constructor(public readonly value: string) {}

  static create(): StockItemId {
    return new StockItemId(randomUUID());
  }

  static fromString(s: string): StockItemId {
    if (!UUID_RE.test(s)) throw new Error(`Invalid StockItemId: ${s}`);
    return new StockItemId(s);
  }

  equals(o: StockItemId): boolean {
    return this.value === o.value;
  }
}
