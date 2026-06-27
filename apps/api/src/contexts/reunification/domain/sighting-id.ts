import { randomUUID } from 'node:crypto';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export class SightingId {
  private constructor(public readonly value: string) {}

  static create(): SightingId {
    return new SightingId(randomUUID());
  }

  static fromString(s: string): SightingId {
    if (!UUID_RE.test(s)) throw new Error(`Invalid SightingId: ${s}`);
    return new SightingId(s);
  }

  equals(o: SightingId): boolean {
    return this.value === o.value;
  }
}
