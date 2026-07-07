import { randomUUID } from 'node:crypto';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Identity of a {@link Zone} — a logical area inside a warehouse (recepción,
 * almacenaje, expedición…). It is an *entity* within the {@link Warehouse}
 * aggregate (loaded and saved with its warehouse), but it still owns a stable
 * id so bins and, later, stock can reference it without depending on its code.
 */
export class ZoneId {
  private constructor(public readonly value: string) {}

  static create(): ZoneId {
    return new ZoneId(randomUUID());
  }

  static fromString(s: string): ZoneId {
    if (!UUID_RE.test(s)) throw new Error(`Invalid ZoneId: ${s}`);
    return new ZoneId(s);
  }

  equals(o: ZoneId): boolean {
    return this.value === o.value;
  }
}
