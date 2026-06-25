import { randomUUID } from 'node:crypto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export class ResourceId {
  private constructor(public readonly value: string) {}
  static create(): ResourceId {
    return new ResourceId(randomUUID());
  }
  static fromString(s: string): ResourceId {
    if (!UUID_RE.test(s)) throw new Error(`Invalid ResourceId: ${s}`);
    return new ResourceId(s);
  }
  equals(o: ResourceId): boolean {
    return this.value === o.value;
  }
}
