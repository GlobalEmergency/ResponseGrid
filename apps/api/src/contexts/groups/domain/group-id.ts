import { randomUUID } from 'node:crypto';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export class GroupId {
  private constructor(public readonly value: string) {}

  static create(): GroupId {
    return new GroupId(randomUUID());
  }

  static fromString(s: string): GroupId {
    if (!UUID_RE.test(s)) throw new Error(`Invalid GroupId: ${s}`);
    return new GroupId(s);
  }

  equals(o: GroupId): boolean {
    return this.value === o.value;
  }
}
