import { randomUUID } from 'node:crypto';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export class ShipmentId {
  private constructor(public readonly value: string) {}

  static create(): ShipmentId {
    return new ShipmentId(randomUUID());
  }

  static fromString(s: string): ShipmentId {
    if (!UUID_RE.test(s)) throw new Error(`Invalid ShipmentId: ${s}`);
    return new ShipmentId(s);
  }

  equals(o: ShipmentId): boolean {
    return this.value === o.value;
  }
}
