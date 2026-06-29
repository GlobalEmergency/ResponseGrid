import { and, asc, desc, eq, isNull, sql, type SQL } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { containerCodeSequencesTable, containersTable } from './schema';
import {
  ContainerRepository,
  ListContainersFilter,
} from '../../domain/ports/container.repository';
import { Container, ContainerSnapshot } from '../../domain/container';
import { ContainerId } from '../../domain/container-id';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import {
  ContainerHolderType,
  ContainerStatus,
  ContainerType,
} from '../../domain/container-enums';

type ContainerRow = typeof containersTable.$inferSelect;

function rowToSnapshot(row: ContainerRow): ContainerSnapshot {
  return {
    id: row.id,
    code: row.code,
    type: row.type as ContainerType,
    emergencyId: row.emergencyId,
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

export class DrizzleContainerRepository implements ContainerRepository {
  constructor(private readonly db: Db) {}

  async save(container: Container): Promise<void> {
    const s = container.toSnapshot();
    await this.db
      .insert(containersTable)
      .values({
        id: s.id,
        emergencyId: s.emergencyId,
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
      })
      .onConflictDoUpdate({
        target: containersTable.id,
        set: {
          parentContainerId: s.parentContainerId,
          lines: s.lines,
          holderType: s.holderType,
          holderId: s.holderId,
          status: s.status,
          updatedAt: s.updatedAt,
        },
      });
  }

  async findById(id: ContainerId): Promise<Container | null> {
    const rows = await this.db
      .select()
      .from(containersTable)
      .where(eq(containersTable.id, id.value))
      .limit(1);
    if (!rows[0]) return null;
    return Container.fromSnapshot(rowToSnapshot(rows[0]));
  }

  async findByEmergency(
    emergencyId: EmergencyId,
    filter: ListContainersFilter,
  ): Promise<Container[]> {
    const conditions: SQL[] = [
      eq(containersTable.emergencyId, emergencyId.value),
    ];
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

    const rows = await this.db
      .select()
      .from(containersTable)
      .where(and(...conditions))
      .orderBy(desc(containersTable.createdAt));

    return rows.map((r) => Container.fromSnapshot(rowToSnapshot(r)));
  }

  async findChildren(parentId: ContainerId): Promise<Container[]> {
    const rows = await this.db
      .select()
      .from(containersTable)
      .where(eq(containersTable.parentContainerId, parentId.value))
      .orderBy(asc(containersTable.createdAt));

    return rows.map((r) => Container.fromSnapshot(rowToSnapshot(r)));
  }

  /**
   * Atomically allocates the next code sequence for a (emergency, type) pair.
   * The upsert increments and returns in a single statement, so concurrent
   * creates never collide and a deleted container never frees its code (the
   * sequence is monotonic, decoupled from the live row count).
   */
  async nextSequence(
    emergencyId: EmergencyId,
    type: ContainerType,
  ): Promise<number> {
    const [row] = await this.db
      .insert(containerCodeSequencesTable)
      .values({ emergencyId: emergencyId.value, type, lastValue: 1 })
      .onConflictDoUpdate({
        target: [
          containerCodeSequencesTable.emergencyId,
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
