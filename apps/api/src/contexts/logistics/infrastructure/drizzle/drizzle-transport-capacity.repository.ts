import { and, eq, SQL } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { transportCapacitiesTable } from './schema';
import {
  TransportCapacityRepository,
  TransportCapacityFilters,
} from '../../domain/ports/transport-capacity.repository';
import {
  TransportCapacity,
  TransportCapacitySnapshot,
} from '../../domain/transport-capacity';
import { TransportCapacityId } from '../../domain/transport-capacity-id';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import {
  TransportMode,
  ProviderType,
  CapacityStatus,
} from '../../domain/transport-capacity-enums';

type Row = typeof transportCapacitiesTable.$inferSelect;

function rowToSnapshot(row: Row): TransportCapacitySnapshot {
  return {
    id: row.id,
    emergencyId: row.emergencyId,
    providerType: row.providerType as ProviderType,
    providerId: row.providerId,
    mode: row.mode as TransportMode,
    weightKg: row.weightKg ?? null,
    volumeM3: row.volumeM3 ?? null,
    originMunicipality: row.originMunicipality,
    destinationMunicipality: row.destinationMunicipality ?? null,
    availableFrom: row.availableFrom,
    availableUntil: row.availableUntil ?? null,
    refrigerated: row.refrigerated,
    notes: row.notes ?? null,
    status: row.status as CapacityStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleTransportCapacityRepository implements TransportCapacityRepository {
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
        weightKg: s.weightKg,
        volumeM3: s.volumeM3,
        originMunicipality: s.originMunicipality,
        destinationMunicipality: s.destinationMunicipality,
        availableFrom: s.availableFrom,
        availableUntil: s.availableUntil,
        refrigerated: s.refrigerated,
        notes: s.notes,
        status: s.status,
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

  async findById(id: TransportCapacityId): Promise<TransportCapacity | null> {
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
    filters?: TransportCapacityFilters,
  ): Promise<TransportCapacity[]> {
    const conditions: SQL[] = [
      eq(transportCapacitiesTable.emergencyId, emergencyId.value),
    ];
    if (filters?.mode !== undefined) {
      conditions.push(eq(transportCapacitiesTable.mode, filters.mode));
    }
    if (filters?.status !== undefined) {
      conditions.push(eq(transportCapacitiesTable.status, filters.status));
    }
    const rows = await this.db
      .select()
      .from(transportCapacitiesTable)
      .where(and(...conditions));
    return rows.map((r) => TransportCapacity.fromSnapshot(rowToSnapshot(r)));
  }
}
