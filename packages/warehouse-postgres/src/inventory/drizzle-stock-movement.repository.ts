import { and, desc, eq, gte, isNotNull, lte, or, type SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  StockMovement,
  StockMovementId,
  StockItemId,
} from '@globalemergency/warehouse-core/inventory';
import type {
  StockMovementRepository,
  ListMovementsFilter,
} from '@globalemergency/warehouse-core/inventory';
import { ScopeId } from '@globalemergency/warehouse-core/kernel';
import { stockMovementsTable } from './schema.js';
import {
  rowToStockMovementSnapshot,
  stockMovementSnapshotToRow,
} from './mappers.js';

/**
 * Adaptador Drizzle/Postgres del puerto {@link StockMovementRepository}. El
 * libro mayor es inmutable: `append` sólo inserta, nunca actualiza ni borra.
 *
 * Idempotencia: el índice único parcial `(scope_id, idempotency_key)` de la
 * migración `wms_0001` garantiza que una entrada reintentada con la misma clave
 * se registre una sola vez. Ante conflicto de clave se hace no-op
 * (`onConflictDoNothing`), de modo que un recibo reintentado deja exactamente
 * un asiento.
 */
export class DrizzleStockMovementRepository implements StockMovementRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async append(movement: StockMovement): Promise<void> {
    const s = movement.toSnapshot();
    const insert = this.db
      .insert(stockMovementsTable)
      .values(stockMovementSnapshotToRow(s));
    // Con clave de idempotencia, el reintento es no-op; sin clave no hay grano
    // que colisione y siempre se inserta.
    if (s.idempotencyKey !== null) {
      // El árbitro del ON CONFLICT debe replicar el predicado del índice único
      // parcial (`WHERE idempotency_key IS NOT NULL`), de ahí el `targetWhere`.
      await insert.onConflictDoNothing({
        target: [
          stockMovementsTable.scopeId,
          stockMovementsTable.idempotencyKey,
        ],
        where: isNotNull(stockMovementsTable.idempotencyKey),
      });
    } else {
      await insert;
    }
  }

  async findById(id: StockMovementId): Promise<StockMovement | null> {
    const [row] = await this.db
      .select()
      .from(stockMovementsTable)
      .where(eq(stockMovementsTable.id, id.value))
      .limit(1);
    return row
      ? StockMovement.fromSnapshot(rowToStockMovementSnapshot(row))
      : null;
  }

  async findByIdempotencyKey(
    scopeId: ScopeId,
    idempotencyKey: string,
  ): Promise<StockMovement | null> {
    const [row] = await this.db
      .select()
      .from(stockMovementsTable)
      .where(
        and(
          eq(stockMovementsTable.scopeId, scopeId.value),
          eq(stockMovementsTable.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    return row
      ? StockMovement.fromSnapshot(rowToStockMovementSnapshot(row))
      : null;
  }

  async findByItem(
    itemId: StockItemId,
    filter: ListMovementsFilter,
  ): Promise<StockMovement[]> {
    // Un item aparece como pata `from` o `to`: se filtra por cualquiera de las dos.
    const legCondition = or(
      eq(stockMovementsTable.fromItemId, itemId.value),
      eq(stockMovementsTable.toItemId, itemId.value),
    );
    const rows = await this.db
      .select()
      .from(stockMovementsTable)
      .where(and(legCondition, ...movementFilters(filter)))
      .orderBy(desc(stockMovementsTable.occurredAt));
    return rows.map((row) =>
      StockMovement.fromSnapshot(rowToStockMovementSnapshot(row)),
    );
  }

  async findByScope(
    scopeId: ScopeId,
    filter: ListMovementsFilter,
  ): Promise<StockMovement[]> {
    const rows = await this.db
      .select()
      .from(stockMovementsTable)
      .where(
        and(
          eq(stockMovementsTable.scopeId, scopeId.value),
          ...movementFilters(filter),
        ),
      )
      .orderBy(desc(stockMovementsTable.occurredAt));
    return rows.map((row) =>
      StockMovement.fromSnapshot(rowToStockMovementSnapshot(row)),
    );
  }
}

/** Condiciones AND del filtro común del libro mayor (tipo/ventana temporal). */
function movementFilters(filter: ListMovementsFilter): SQL[] {
  const conditions: SQL[] = [];
  if (filter.kind !== undefined) {
    conditions.push(eq(stockMovementsTable.kind, filter.kind));
  }
  if (filter.occurredFrom !== undefined) {
    conditions.push(gte(stockMovementsTable.occurredAt, filter.occurredFrom));
  }
  if (filter.occurredTo !== undefined) {
    conditions.push(lte(stockMovementsTable.occurredAt, filter.occurredTo));
  }
  return conditions;
}
