import { randomUUID } from 'node:crypto';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export class DonationIntakeId {
  private constructor(public readonly value: string) {}

  static create(): DonationIntakeId {
    return new DonationIntakeId(randomUUID());
  }

  static fromString(s: string): DonationIntakeId {
    if (!UUID_RE.test(s)) throw new Error(`Invalid DonationIntakeId: ${s}`);
    return new DonationIntakeId(s);
  }

  equals(o: DonationIntakeId): boolean {
    return this.value === o.value;
  }
}
