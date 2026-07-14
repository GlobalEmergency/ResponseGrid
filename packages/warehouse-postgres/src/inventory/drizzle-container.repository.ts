import { and, asc, desc, eq, isNull, sql, type SQL } from 'drizzle-orm';
import {
  Container,
  ContainerId,
  ContainerHolderType,
  ContainerStatus,
  ContainerType,
} from '@globalemergency/warehouse-core/containers';
import type {
  ContainerRepository,
  ContainerSnapshot,
  ListContainersFilter,
} from '@globalemergency/warehouse-core/containers';
import { ScopeId } from '@globalemergency/warehouse-core/kernel';
import type { WmsDatabase } from './db.js';
import { containerCodeSequencesTable, containersTable } from './schema.js';

type ContainerRow = typeof containersTable.$inferSelect;

/**
 * Fila → {@link ContainerSnapshot}. `gross_weight_kg`/`gross_volume_m3` son
 * `double precision`, así que Drizzle los devuelve como number directo (no como
 * string, a diferencia del `numeric` del stock): no hace falta coerción. Las
 * líneas viajan como jsonb ya tipado (`SupplyLineSnapshot[]`).
 */
function rowToContainerSnapshot(row: ContainerRow): ContainerSnapshot {
  return {
    id: row.id,
    code: row.code,
    type: row.type as ContainerType,
    scopeId: row.scopeId,
    parentContainerId: row.parentContainerId ?? null,
    lines: row.lines ?? [],
    grossWeightKg: row.grossWeightKg ?? null,
    grossVolumeM3: row.grossVolumeM3 ?? null,
    holderType: (row.holderType as ContainerHolderType | null) ?? null,
    holderId: row.holderId ?? null,
    status: row.status as ContainerStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/** {@link ContainerSnapshot} → columnas de la fila del container (para el alta). */
function containerSnapshotToRow(
  s: ContainerSnapshot,
): typeof containersTable.$inferInsert {
  return {
    id: s.id,
    scopeId: s.scopeId,
    code: s.code,
    type: s.type,
    parentContainerId: s.parentContainerId,
    lines: s.lines,
    grossWeightKg: s.grossWeightKg,
    grossVolumeM3: s.grossVolumeM3,
    holderType: s.holderType,
    holderId: s.holderId,
    status: s.status,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

/**
 * Adaptador Drizzle/Postgres del puerto {@link ContainerRepository} de
 * warehouse-core. Opera sobre `scope_id` opaco (la tenencia); no sabe si es una
 * emergencia (ResponseGrid) o una organización (WMS standalone).
 *
 * `save` es un upsert por id (idempotente): el alta fija código/tipo/scope/alta
 * y las mutaciones posteriores (nido, líneas, holder, estado, updatedAt) se
 * refrescan en el `ON CONFLICT DO UPDATE`. Se tipa sobre {@link WmsDatabase}
 * para poder construirse tanto sobre el `db` del pool como sobre un `tx` de la
 * Unit of Work (persistir un palet y su stock en la misma transacción).
 */
export class DrizzleContainerRepository implements ContainerRepository {
  constructor(private readonly db: WmsDatabase) {}

  async save(container: Container): Promise<void> {
    const s = container.toSnapshot();
    await this.db
      .insert(containersTable)
      .values(containerSnapshotToRow(s))
      .onConflictDoUpdate({
        target: containersTable.id,
        set: {
          // El código/tipo/scope/createdAt son inmutables tras el alta; sólo
          // cambian la posición, el contenido, el holder y el estado.
          parentContainerId: s.parentContainerId,
          lines: s.lines,
          grossWeightKg: s.grossWeightKg,
          grossVolumeM3: s.grossVolumeM3,
          holderType: s.holderType,
          holderId: s.holderId,
          status: s.status,
          updatedAt: s.updatedAt,
        },
      });
  }

  async findById(id: ContainerId): Promise<Container | null> {
    const [row] = await this.db
      .select()
      .from(containersTable)
      .where(eq(containersTable.id, id.value))
      .limit(1);
    return row ? Container.fromSnapshot(rowToContainerSnapshot(row)) : null;
  }

  async findByScope(
    scopeId: ScopeId,
    filter: ListContainersFilter,
  ): Promise<Container[]> {
    const rows = await this.db
      .select()
      .from(containersTable)
      .where(and(eq(containersTable.scopeId, scopeId.value), ...containerFilters(filter)))
      .orderBy(desc(containersTable.createdAt));
    return rows.map((row) =>
      Container.fromSnapshot(rowToContainerSnapshot(row)),
    );
  }

  /** Hijos directos de un container (la composición es por referencia). */
  async findChildren(parentId: ContainerId): Promise<Container[]> {
    const rows = await this.db
      .select()
      .from(containersTable)
      .where(eq(containersTable.parentContainerId, parentId.value))
      .orderBy(asc(containersTable.createdAt));
    return rows.map((row) =>
      Container.fromSnapshot(rowToContainerSnapshot(row)),
    );
  }

  /**
   * Asigna atómicamente el siguiente valor de código para el par (scope, type).
   * El upsert incrementa y devuelve en una sola sentencia, así que dos altas
   * concurrentes nunca colisionan y un container borrado nunca libera su código
   * (la secuencia es monotónica, desacoplada del recuento de filas vivas).
   */
  async nextSequence(scopeId: ScopeId, type: ContainerType): Promise<number> {
    const [row] = await this.db
      .insert(containerCodeSequencesTable)
      .values({ scopeId: scopeId.value, type, lastValue: 1 })
      .onConflictDoUpdate({
        target: [
          containerCodeSequencesTable.scopeId,
          containerCodeSequencesTable.type,
        ],
        set: { lastValue: sql`${containerCodeSequencesTable.lastValue} + 1` },
      })
      .returning({ value: containerCodeSequencesTable.lastValue });
    if (!row) {
      throw new Error('Container code sequence allocation returned no row');
    }
    return row.value;
  }
}

/** Condiciones AND del filtro de listado de containers dentro de un scope. */
function containerFilters(filter: ListContainersFilter): SQL[] {
  const conditions: SQL[] = [];
  if (filter.type !== undefined) {
    conditions.push(eq(containersTable.type, filter.type));
  }
  if (filter.status !== undefined) {
    conditions.push(eq(containersTable.status, filter.status));
  }
  if (filter.holderType !== undefined) {
    conditions.push(eq(containersTable.holderType, filter.holderType));
  }
  if (filter.holderId !== undefined) {
    conditions.push(eq(containersTable.holderId, filter.holderId));
  }
  if (filter.topLevelOnly) {
    conditions.push(isNull(containersTable.parentContainerId));
  }
  return conditions;
}
