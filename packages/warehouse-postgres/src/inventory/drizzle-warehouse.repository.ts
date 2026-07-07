import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  Warehouse,
  WarehouseId,
} from '@globalemergency/warehouse-core/inventory';
import type {
  WarehouseRepository,
  ListWarehousesFilter,
} from '@globalemergency/warehouse-core/inventory';
// ScopeId es del kernel (tenencia genérica), no del módulo inventory.
import { ScopeId } from '@globalemergency/warehouse-core/kernel';
import { warehousesTable, zonesTable } from './schema.js';
import {
  rowsToWarehouseSnapshot,
  warehouseSnapshotToRow,
  zoneSnapshotToRow,
} from './mappers.js';

/**
 * Adaptador Drizzle/Postgres del puerto {@link WarehouseRepository}. El almacén
 * es un agregado que posee sus zonas (entidades): se persisten en su propia
 * tabla `wms.zones` (FK con cascada) y se reconstruye vía
 * `Warehouse.fromSnapshot` con el array de zonas.
 *
 * `save` es un upsert del almacén + reemplazo total de sus zonas (delete +
 * reinsert) dentro de una transacción: las zonas son pocas y siempre se cargan
 * con su almacén, así que el reemplazo es la operación correcta más simple y
 * respeta el invariante de "estado completo del agregado".
 */
export class DrizzleWarehouseRepository implements WarehouseRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async save(warehouse: Warehouse): Promise<void> {
    const s = warehouse.toSnapshot();
    await this.db.transaction(async (tx) => {
      await tx
        .insert(warehousesTable)
        .values(warehouseSnapshotToRow(s))
        .onConflictDoUpdate({
          target: warehousesTable.id,
          set: {
            code: s.code,
            name: s.name,
            address: s.address,
            lat: s.lat,
            lng: s.lng,
            status: s.status,
            updatedAt: s.updatedAt,
          },
        });

      // Reemplazo total de zonas: borra las actuales y reinserta el snapshot.
      await tx.delete(zonesTable).where(eq(zonesTable.warehouseId, s.id));
      if (s.zones.length > 0) {
        await tx
          .insert(zonesTable)
          .values(s.zones.map((z) => zoneSnapshotToRow(s.id, z)));
      }
    });
  }

  async findById(id: WarehouseId): Promise<Warehouse | null> {
    const [row] = await this.db
      .select()
      .from(warehousesTable)
      .where(eq(warehousesTable.id, id.value))
      .limit(1);
    if (!row) return null;
    return this.hydrate(row);
  }

  async findByCode(scopeId: ScopeId, code: string): Promise<Warehouse | null> {
    const [row] = await this.db
      .select()
      .from(warehousesTable)
      .where(
        and(
          eq(warehousesTable.scopeId, scopeId.value),
          eq(warehousesTable.code, code),
        ),
      )
      .limit(1);
    if (!row) return null;
    return this.hydrate(row);
  }

  async findByScope(
    scopeId: ScopeId,
    filter: ListWarehousesFilter,
  ): Promise<Warehouse[]> {
    const conditions = [eq(warehousesTable.scopeId, scopeId.value)];
    if (filter.status !== undefined) {
      conditions.push(eq(warehousesTable.status, filter.status));
    }
    const rows = await this.db
      .select()
      .from(warehousesTable)
      .where(and(...conditions));
    return Promise.all(rows.map((row) => this.hydrate(row)));
  }

  /** Carga las zonas del almacén y reconstruye el agregado. */
  private async hydrate(
    row: typeof warehousesTable.$inferSelect,
  ): Promise<Warehouse> {
    const zones = await this.db
      .select()
      .from(zonesTable)
      .where(eq(zonesTable.warehouseId, row.id));
    return Warehouse.fromSnapshot(rowsToWarehouseSnapshot(row, zones));
  }
}
