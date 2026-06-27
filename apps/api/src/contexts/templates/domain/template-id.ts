import { randomUUID } from 'node:crypto';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export class TemplateId {
  private constructor(public readonly value: string) {}

  static create(): TemplateId {
    return new TemplateId(randomUUID());
  }

  static fromString(s: string): TemplateId {
    if (!UUID_RE.test(s)) throw new Error(`Invalid TemplateId: ${s}`);
    return new TemplateId(s);
  }

  equals(o: TemplateId): boolean {
    return this.value === o.value;
  }
}
