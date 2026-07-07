import { and, eq, isNull, type SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  StockItem,
  StockItemId,
  BinId,
  WarehouseId,
} from '@globalemergency/warehouse-core/inventory';
import type {
  StockItemRepository,
  ListStockFilter,
  StockGrainKey,
} from '@globalemergency/warehouse-core/inventory';
import { ScopeId } from '@globalemergency/warehouse-core/kernel';
import { stockItemsTable } from './schema.js';
import { rowToStockItemSnapshot, stockItemSnapshotToRow } from './mappers.js';
import { StaleStockItemError } from './stock-persistence-errors.js';

/**
 * Adaptador Drizzle/Postgres del puerto {@link StockItemRepository}.
 *
 * Concurrencia optimista: un item nuevo (version === 1) se INSERTA; uno
 * existente se ACTUALIZA con `WHERE id = :id AND version = :version - 1`. Si el
 * UPDATE no afecta filas, otro proceso ganó la carrera → {@link StaleStockItemError}.
 *
 * El grano único (bin, supply, lote, estado) lo garantizan los índices únicos
 * parciales de la migración `wms_0001` (uno para lote presente, otro para lote
 * nulo): la BBDD rechaza un segundo item en el mismo grano.
 */
export class DrizzleStockItemRepository implements StockItemRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async save(item: StockItem): Promise<void> {
    const s = item.toSnapshot();
    if (s.version === 1) {
      // Alta: el índice de grano rechaza un duplicado con un error de la BBDD.
      await this.db.insert(stockItemsTable).values(stockItemSnapshotToRow(s));
      return;
    }

    // Actualización con guarda de versión. `version - 1` es la versión que el
    // agregado leyó antes de mutar; si la fila ya no la tiene, está obsoleta.
    const result = await this.db
      .update(stockItemsTable)
      .set({
        // El grano (bin/supply/lote/estado) es inmutable; sólo cambian
        // cantidad, versión y updatedAt.
        quantityAmount: s.quantityAmount.toString(),
        version: s.version,
        updatedAt: s.updatedAt,
      })
      .where(
        and(
          eq(stockItemsTable.id, s.id),
          eq(stockItemsTable.version, s.version - 1),
        ),
      )
      .returning({ id: stockItemsTable.id });

    if (result.length === 0) {
      throw new StaleStockItemError(s.id, s.version - 1);
    }
  }

  async findById(id: StockItemId): Promise<StockItem | null> {
    const [row] = await this.db
      .select()
      .from(stockItemsTable)
      .where(eq(stockItemsTable.id, id.value))
      .limit(1);
    return row ? StockItem.fromSnapshot(rowToStockItemSnapshot(row)) : null;
  }

  async findByGrain(key: StockGrainKey): Promise<StockItem | null> {
    // El lote nulo se compara con IS NULL, no con `= NULL`.
    const lotCondition =
      key.lotCode === null
        ? isNull(stockItemsTable.lotCode)
        : eq(stockItemsTable.lotCode, key.lotCode);
    const [row] = await this.db
      .select()
      .from(stockItemsTable)
      .where(
        and(
          eq(stockItemsTable.binId, key.binId),
          eq(stockItemsTable.supplyId, key.supplyId),
          lotCondition,
          eq(stockItemsTable.status, key.status),
        ),
      )
      .limit(1);
    return row ? StockItem.fromSnapshot(rowToStockItemSnapshot(row)) : null;
  }

  async findByBin(binId: BinId, filter: ListStockFilter): Promise<StockItem[]> {
    const rows = await this.db
      .select()
      .from(stockItemsTable)
      .where(
        and(eq(stockItemsTable.binId, binId.value), ...stockFilters(filter)),
      );
    return rows.map((row) =>
      StockItem.fromSnapshot(rowToStockItemSnapshot(row)),
    );
  }

  async findByWarehouse(
    warehouseId: WarehouseId,
    filter: ListStockFilter,
  ): Promise<StockItem[]> {
    const rows = await this.db
      .select()
      .from(stockItemsTable)
      .where(
        and(
          eq(stockItemsTable.warehouseId, warehouseId.value),
          ...stockFilters(filter),
        ),
      );
    return rows.map((row) =>
      StockItem.fromSnapshot(rowToStockItemSnapshot(row)),
    );
  }

  async findByScope(
    scopeId: ScopeId,
    filter: ListStockFilter,
  ): Promise<StockItem[]> {
    const rows = await this.db
      .select()
      .from(stockItemsTable)
      .where(
        and(
          eq(stockItemsTable.scopeId, scopeId.value),
          ...stockFilters(filter),
        ),
      );
    return rows.map((row) =>
      StockItem.fromSnapshot(rowToStockItemSnapshot(row)),
    );
  }
}

/** Condiciones AND del filtro común de stock (estado/producto). */
function stockFilters(filter: ListStockFilter): SQL[] {
  const conditions: SQL[] = [];
  if (filter.status !== undefined) {
    conditions.push(eq(stockItemsTable.status, filter.status));
  }
  if (filter.supplyId !== undefined) {
    conditions.push(eq(stockItemsTable.supplyId, filter.supplyId));
  }
  return conditions;
}
