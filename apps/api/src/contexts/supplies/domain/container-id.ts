import { randomUUID } from 'node:crypto';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Identity of a {@link Container} (palet/caja/lote). Like the other aggregate
 * ids in the platform it is a UUID value object — a container is a *trackable*
 * aggregate (it moves between hubs and shipments and keeps its identity), so it
 * owns an id rather than being an embedded value object.
 */
export class ContainerId {
  private constructor(public readonly value: string) {}

  static create(): ContainerId {
    return new ContainerId(randomUUID());
  }

  static fromString(s: string): ContainerId {
    if (!UUID_RE.test(s)) throw new Error(`Invalid ContainerId: ${s}`);
    return new ContainerId(s);
  }

  equals(o: ContainerId): boolean {
    return this.value === o.value;
  }
}
