import { randomUUID } from 'node:crypto';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Identity of a {@link Bin} — a discrete physical location inside a warehouse
 * (a shelf, a floor spot, a dock door…). A UUID value object: a bin is a
 * high-write aggregate root of its own (it will hold stock), so it owns an id
 * and is referenced by warehouse/zone id, not embedded.
 */
export class BinId {
  private constructor(public readonly value: string) {}

  static create(): BinId {
    return new BinId(randomUUID());
  }

  static fromString(s: string): BinId {
    if (!UUID_RE.test(s)) throw new Error(`Invalid BinId: ${s}`);
    return new BinId(s);
  }

  equals(o: BinId): boolean {
    return this.value === o.value;
  }
}
