import { randomUUID } from 'node:crypto';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export class MissingPersonReportId {
  private constructor(public readonly value: string) {}

  static create(): MissingPersonReportId {
    return new MissingPersonReportId(randomUUID());
  }

  static fromString(s: string): MissingPersonReportId {
    if (!UUID_RE.test(s))
      throw new Error(`Invalid MissingPersonReportId: ${s}`);
    return new MissingPersonReportId(s);
  }

  equals(o: MissingPersonReportId): boolean {
    return this.value === o.value;
  }
}
