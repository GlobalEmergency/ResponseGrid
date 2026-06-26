import { randomUUID } from 'node:crypto';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export class OfferId {
  private constructor(public readonly value: string) {}

  static create(): OfferId {
    return new OfferId(randomUUID());
  }

  static fromString(s: string): OfferId {
    if (!UUID_RE.test(s)) throw new Error(`Invalid OfferId: ${s}`);
    return new OfferId(s);
  }

  equals(o: OfferId): boolean {
    return this.value === o.value;
  }
}
