import { and, desc, eq, gte, isNotNull, lte, or, type SQL } from 'drizzle-orm';
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
import type { WmsDatabase } from './db.js';
import { stockMovementsTable } from './schema.js';
import {
  rowToStockMovementSnapshot,
  stockMovementSnapshotToRow,
} from './mappers.js';
import { IdempotencyKeyConflictError } from './stock-persistence-errors.js';

/**
 * Adaptador Drizzle/Postgres del puerto {@link StockMovementRepository}. El
 * libro mayor es inmutable: `append` sólo inserta, nunca actualiza ni borra.
 *
 * Idempotencia: el índice único parcial `(scope_id, idempotency_key)` de la
 * migración `wms_0001` garantiza que una entrada reintentada con la misma clave
 * se registre una sola vez. Ante conflicto de clave, si el asiento ya persistido
 * es el MISMO movimiento lógico (mismo tipo/cantidad/unidad/patas) es un
 * reintento legítimo → no-op; si es DISTINTO, la clave se está reutilizando en
 * conflicto y se lanza {@link IdempotencyKeyConflictError} en vez de silenciar
 * un doble-registro divergente.
 */
export class DrizzleStockMovementRepository implements StockMovementRepository {
  constructor(private readonly db: WmsDatabase) {}

  async append(movement: StockMovement): Promise<void> {
    const s = movement.toSnapshot();
    // Sin clave de idempotencia no hay grano que colisione: inserción directa.
    if (s.idempotencyKey === null) {
      await this.db
        .insert(stockMovementsTable)
        .values(stockMovementSnapshotToRow(s));
      return;
    }

    // Con clave: inserta con `onConflictDoNothing` y `.returning` para saber si
    // se insertó (fila devuelta) o chocó (sin filas). El árbitro replica el
    // predicado del índice único parcial (`WHERE idempotency_key IS NOT NULL`).
    const inserted = await this.db
      .insert(stockMovementsTable)
      .values(stockMovementSnapshotToRow(s))
      .onConflictDoNothing({
        target: [
          stockMovementsTable.scopeId,
          stockMovementsTable.idempotencyKey,
        ],
        where: isNotNull(stockMovementsTable.idempotencyKey),
      })
      .returning({ id: stockMovementsTable.id });

    if (inserted.length > 0) return; // Insertado: nada más que hacer.

    // Conflicto de clave: carga el asiento existente y compáralo. Si es el mismo
    // movimiento lógico es un reintento idempotente (no-op); si difiere, la
    // clave se reutiliza para otro movimiento → error tipado.
    const existing = await this.findByIdempotencyKey(
      movement.scopeId,
      s.idempotencyKey,
    );
    if (existing === null || !isSameLogicalMovement(existing, movement)) {
      throw new IdempotencyKeyConflictError(s.scopeId, s.idempotencyKey);
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
      // Orden determinista: por instante desc y, para empates, por id desc.
      .orderBy(
        desc(stockMovementsTable.occurredAt),
        desc(stockMovementsTable.id),
      );
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
      // Orden determinista: por instante desc y, para empates, por id desc.
      .orderBy(
        desc(stockMovementsTable.occurredAt),
        desc(stockMovementsTable.id),
      );
    return rows.map((row) =>
      StockMovement.fromSnapshot(rowToStockMovementSnapshot(row)),
    );
  }
}

/**
 * True si dos movimientos representan el MISMO asiento lógico: mismo tipo,
 * cantidad, unidad y patas (from/to). El id y el `occurredAt` pueden diferir
 * entre el reintento y el original y aun así ser el mismo movimiento; lo que
 * distingue un reintento legítimo de una reutilización en conflicto de la clave
 * es que el contenido del asiento coincida.
 */
function isSameLogicalMovement(a: StockMovement, b: StockMovement): boolean {
  const x = a.toSnapshot();
  const y = b.toSnapshot();
  return (
    x.kind === y.kind &&
    x.quantityAmount === y.quantityAmount &&
    x.unit === y.unit &&
    x.fromItemId === y.fromItemId &&
    x.toItemId === y.toItemId
  );
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
