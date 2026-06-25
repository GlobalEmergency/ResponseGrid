import { randomUUID } from 'node:crypto';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export class UserId {
  private constructor(public readonly value: string) {}

  static create(): UserId {
    return new UserId(randomUUID());
  }

  static fromString(s: string): UserId {
    if (!UUID_RE.test(s)) throw new Error(`Invalid UserId: ${s}`);
    return new UserId(s);
  }

  equals(o: UserId): boolean {
    return this.value === o.value;
  }
}
