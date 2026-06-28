import { and, eq, gte, isNull, lte, or, type SQL } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { transportCapacitiesTable } from './schema';
import {
  ListCapacitiesFilter,
  TransportCapacityRepository,
} from '../../domain/ports/transport-capacity.repository';
import {
  TransportCapacity,
  TransportCapacitySnapshot,
} from '../../domain/transport-capacity';
import { TransportCapacityId } from '../../domain/transport-capacity-id';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import {
  TransportCapacityStatus,
  TransportMode,
  TransportProviderType,
} from '../../domain/transport-capacity-enums';
import { CoverageProps } from '../../domain/coverage';

type CapacityRow = typeof transportCapacitiesTable.$inferSelect;

function rowToSnapshot(row: CapacityRow): TransportCapacitySnapshot {
  return {
    id: row.id,
    emergencyId: row.emergencyId,
    providerType: row.providerType as TransportProviderType,
    providerId: row.providerId,
    mode: row.mode as TransportMode,
    capacity: {
      weightKg: row.weightKg ?? null,
      volumeM3: row.volumeM3 ?? null,
    },
    coverage: row.coverage as CoverageProps,
    window: {
      from: row.windowFrom ? row.windowFrom.toISOString() : null,
      to: row.windowTo ? row.windowTo.toISOString() : null,
    },
    constraints: row.constraints ?? [],
    status: row.status as TransportCapacityStatus,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleTransportCapacityRepository
  implements TransportCapacityRepository
{
  constructor(private readonly db: Db) {}

  async save(capacity: TransportCapacity): Promise<void> {
    const s = capacity.toSnapshot();
    await this.db
      .insert(transportCapacitiesTable)
      .values({
        id: s.id,
        emergencyId: s.emergencyId,
        providerType: s.providerType,
        providerId: s.providerId,
        mode: s.mode,
        weightKg: s.capacity.weightKg,
        volumeM3: s.capacity.volumeM3,
        coverage: s.coverage,
        windowFrom: s.window.from ? new Date(s.window.from) : null,
        windowTo: s.window.to ? new Date(s.window.to) : null,
        constraints: s.constraints,
        status: s.status,
        notes: s.notes,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })
      .onConflictDoUpdate({
        target: transportCapacitiesTable.id,
        set: {
          status: s.status,
          updatedAt: s.updatedAt,
        },
      });
  }

  async findById(
    id: TransportCapacityId,
  ): Promise<TransportCapacity | null> {
    const rows = await this.db
      .select()
      .from(transportCapacitiesTable)
      .where(eq(transportCapacitiesTable.id, id.value))
      .limit(1);
    if (!rows[0]) return null;
    return TransportCapacity.fromSnapshot(rowToSnapshot(rows[0]));
  }

  async findByEmergency(
    emergencyId: EmergencyId,
    filter: ListCapacitiesFilter,
  ): Promise<TransportCapacity[]> {
    const conditions: SQL[] = [
      eq(transportCapacitiesTable.emergencyId, emergencyId.value),
    ];

    if (filter.mode !== undefined) {
      conditions.push(eq(transportCapacitiesTable.mode, filter.mode));
    }
    if (filter.status !== undefined) {
      conditions.push(eq(transportCapacitiesTable.status, filter.status));
    }
    // Window overlap: a capacity matches when it doesn't end before the
    // requested start and doesn't start after the requested end. Null bounds
    // are open-ended and always overlap on that side.
    if (filter.availableFrom !== undefined) {
      const from = new Date(filter.availableFrom);
      conditions.push(
        or(
          isNull(transportCapacitiesTable.windowTo),
          gte(transportCapacitiesTable.windowTo, from),
        ) as SQL,
      );
    }
    if (filter.availableTo !== undefined) {
      const to = new Date(filter.availableTo);
      conditions.push(
        or(
          isNull(transportCapacitiesTable.windowFrom),
          lte(transportCapacitiesTable.windowFrom, to),
        ) as SQL,
      );
    }

    const rows = await this.db
      .select()
      .from(transportCapacitiesTable)
      .where(and(...conditions))
      .orderBy(transportCapacitiesTable.createdAt);

    return rows
      .map((r) => TransportCapacity.fromSnapshot(rowToSnapshot(r)))
      .reverse();
  }
}
