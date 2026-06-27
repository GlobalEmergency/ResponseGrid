import { and, count, eq, inArray } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { resourcesTable } from './schema';
import { ResourceRepository } from '../../domain/ports/resource.repository';
import { Resource, ResourceSnapshot } from '../../domain/resource';
import { ResourceId } from '../../domain/resource-id';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import {
  ResourceType,
  ResourceStage,
  VerificationLevel,
  PublicStatus,
} from '../../domain/resource-enums';

type Row = typeof resourcesTable.$inferSelect;

function rowToSnapshot(row: Row): ResourceSnapshot {
  return {
    id: row.id,
    emergencyId: row.emergencyId,
    type: row.type as ResourceType,
    stage: row.stage as ResourceStage,
    name: row.name,
    description: row.description ?? null,
    location: {
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
    },
    ownerUserId: row.ownerUserId,
    ownerOrganizationId: row.ownerOrganizationId ?? null,
    verificationLevel: row.verificationLevel as VerificationLevel,
    publicStatus: row.publicStatus as PublicStatus,
    createdAt: row.createdAt,
  };
}

export class DrizzleResourceRepository implements ResourceRepository {
  constructor(private readonly db: Db) {}

  async save(resource: Resource): Promise<void> {
    const s = resource.toSnapshot();
    await this.db
      .insert(resourcesTable)
      .values({
        id: s.id,
        emergencyId: s.emergencyId,
        type: s.type,
        stage: s.stage,
        name: s.name,
        description: s.description,
        address: s.location.address,
        latitude: s.location.latitude,
        longitude: s.location.longitude,
        ownerUserId: s.ownerUserId,
        ownerOrganizationId: s.ownerOrganizationId,
        verificationLevel: s.verificationLevel,
        publicStatus: s.publicStatus,
        createdAt: s.createdAt,
      })
      .onConflictDoUpdate({
        target: resourcesTable.id,
        set: {
          verificationLevel: s.verificationLevel,
          publicStatus: s.publicStatus,
          name: s.name,
        },
      });
  }

  async findById(id: ResourceId): Promise<Resource | null> {
    const rows = await this.db
      .select()
      .from(resourcesTable)
      .where(eq(resourcesTable.id, id.value))
      .limit(1);
    return rows[0] ? Resource.fromSnapshot(rowToSnapshot(rows[0])) : null;
  }

  async findPendingByEmergency(emergencyId: EmergencyId): Promise<Resource[]> {
    const rows = await this.db
      .select()
      .from(resourcesTable)
      .where(
        and(
          eq(resourcesTable.emergencyId, emergencyId.value),
          eq(resourcesTable.verificationLevel, VerificationLevel.Unverified),
        ),
      );
    return rows.map((r) => Resource.fromSnapshot(rowToSnapshot(r)));
  }

  async findActiveByEmergency(emergencyId: EmergencyId): Promise<Resource[]> {
    const rows = await this.db
      .select()
      .from(resourcesTable)
      .where(
        and(
          eq(resourcesTable.emergencyId, emergencyId.value),
          eq(resourcesTable.publicStatus, PublicStatus.Active),
        ),
      );
    return rows.map((r) => Resource.fromSnapshot(rowToSnapshot(r)));
  }

  async findByOwnerAndEmergency(
    ownerUserId: string,
    emergencyId: EmergencyId,
  ): Promise<Resource[]> {
    const rows = await this.db
      .select()
      .from(resourcesTable)
      .where(
        and(
          eq(resourcesTable.emergencyId, emergencyId.value),
          eq(resourcesTable.ownerUserId, ownerUserId),
        ),
      );
    return rows.map((r) => Resource.fromSnapshot(rowToSnapshot(r)));
  }

  async findVisibleByEmergency(emergencyId: EmergencyId): Promise<Resource[]> {
    const rows = await this.db
      .select()
      .from(resourcesTable)
      .where(
        and(
          eq(resourcesTable.emergencyId, emergencyId.value),
          inArray(resourcesTable.publicStatus, [
            PublicStatus.Active,
            PublicStatus.Saturated,
            PublicStatus.Paused,
          ]),
        ),
      );
    return rows.map((r) => Resource.fromSnapshot(rowToSnapshot(r)));
  }

  async countByEmergencyGroupedByPublicStatus(
    emergencyId: EmergencyId,
  ): Promise<Record<PublicStatus, number>> {
    const rows = await this.db
      .select({ publicStatus: resourcesTable.publicStatus, cnt: count() })
      .from(resourcesTable)
      .where(eq(resourcesTable.emergencyId, emergencyId.value))
      .groupBy(resourcesTable.publicStatus);

    const result: Record<PublicStatus, number> = {
      [PublicStatus.Hidden]: 0,
      [PublicStatus.Active]: 0,
      [PublicStatus.Saturated]: 0,
      [PublicStatus.Paused]: 0,
      [PublicStatus.Closed]: 0,
    };
    for (const row of rows) {
      const status = row.publicStatus as PublicStatus;
      if (status in result) {
        result[status] = Number(row.cnt);
      }
    }
    return result;
  }
}
