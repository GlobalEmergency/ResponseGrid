import { randomUUID } from 'node:crypto';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Identity of a {@link Warehouse} — the physical building a Protección Civil
 * (or any organization) operates. A UUID value object like every other
 * aggregate id in the platform: a warehouse keeps its identity across renames
 * and moves.
 */
export class WarehouseId {
  private constructor(public readonly value: string) {}

  static create(): WarehouseId {
    return new WarehouseId(randomUUID());
  }

  static fromString(s: string): WarehouseId {
    if (!UUID_RE.test(s)) throw new Error(`Invalid WarehouseId: ${s}`);
    return new WarehouseId(s);
  }

  equals(o: WarehouseId): boolean {
    return this.value === o.value;
  }
}
