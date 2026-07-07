import { and, eq, type SQL } from 'drizzle-orm';
import {
  Bin,
  BinId,
  WarehouseId,
} from '@globalemergency/warehouse-core/inventory';
import type {
  BinRepository,
  ListBinsFilter,
} from '@globalemergency/warehouse-core/inventory';
import { ScopeId } from '@globalemergency/warehouse-core/kernel';
import type { WmsDatabase } from './db.js';
import { binsTable } from './schema.js';
import { rowToBinSnapshot, binSnapshotToRow } from './mappers.js';

/**
 * Adaptador Drizzle/Postgres del puerto {@link BinRepository}. El bin es un
 * agregado propio y plano (sin hijos): `save` es un upsert directo por id, y los
 * finders reconstruyen vía `Bin.fromSnapshot`.
 */
export class DrizzleBinRepository implements BinRepository {
  constructor(private readonly db: WmsDatabase) {}

  async save(bin: Bin): Promise<void> {
    const s = bin.toSnapshot();
    await this.db
      .insert(binsTable)
      .values(binSnapshotToRow(s))
      .onConflictDoUpdate({
        target: binsTable.id,
        set: {
          // El almacén de un bin es inmutable; la zona y el estado sí cambian.
          zoneId: s.zoneId,
          status: s.status,
          updatedAt: s.updatedAt,
        },
      });
  }

  async findById(id: BinId): Promise<Bin | null> {
    const [row] = await this.db
      .select()
      .from(binsTable)
      .where(eq(binsTable.id, id.value))
      .limit(1);
    return row ? Bin.fromSnapshot(rowToBinSnapshot(row)) : null;
  }

  async findByCode(
    warehouseId: WarehouseId,
    code: string,
  ): Promise<Bin | null> {
    const [row] = await this.db
      .select()
      .from(binsTable)
      .where(
        and(
          eq(binsTable.warehouseId, warehouseId.value),
          eq(binsTable.code, code),
        ),
      )
      .limit(1);
    return row ? Bin.fromSnapshot(rowToBinSnapshot(row)) : null;
  }

  async findByWarehouse(
    warehouseId: WarehouseId,
    filter: ListBinsFilter,
  ): Promise<Bin[]> {
    const rows = await this.db
      .select()
      .from(binsTable)
      .where(
        and(
          eq(binsTable.warehouseId, warehouseId.value),
          ...binFilters(filter),
        ),
      );
    return rows.map((row) => Bin.fromSnapshot(rowToBinSnapshot(row)));
  }

  async findByScope(scopeId: ScopeId, filter: ListBinsFilter): Promise<Bin[]> {
    const rows = await this.db
      .select()
      .from(binsTable)
      .where(and(eq(binsTable.scopeId, scopeId.value), ...binFilters(filter)));
    return rows.map((row) => Bin.fromSnapshot(rowToBinSnapshot(row)));
  }
}

/** Condiciones AND del filtro común de bins (estado/tipo/zona). */
function binFilters(filter: ListBinsFilter): SQL[] {
  const conditions: SQL[] = [];
  if (filter.status !== undefined) {
    conditions.push(eq(binsTable.status, filter.status));
  }
  if (filter.kind !== undefined) {
    conditions.push(eq(binsTable.kind, filter.kind));
  }
  if (filter.zoneId !== undefined) {
    conditions.push(eq(binsTable.zoneId, filter.zoneId));
  }
  return conditions;
}
