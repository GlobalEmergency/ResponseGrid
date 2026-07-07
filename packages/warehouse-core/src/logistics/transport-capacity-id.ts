import { randomUUID } from 'node:crypto';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export class TransportCapacityId {
  private constructor(public readonly value: string) {}

  static create(): TransportCapacityId {
    return new TransportCapacityId(randomUUID());
  }

  static fromString(s: string): TransportCapacityId {
    if (!UUID_RE.test(s)) throw new Error(`Invalid TransportCapacityId: ${s}`);
    return new TransportCapacityId(s);
  }

  equals(o: TransportCapacityId): boolean {
    return this.value === o.value;
  }
}
