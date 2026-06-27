import { and, count, eq, inArray } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { resourcesTable } from './schema';
import { ResourceRepository } from '../../domain/ports/resource.repository';
import { Resource, ResourceSnapshot, Provenance } from '../../domain/resource';
import { ResourceId } from '../../domain/resource-id';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import {
  ResourceType,
  ResourceStage,
  VerificationLevel,
  PublicStatus,
} from '../../domain/resource-enums';

type Row = typeof resourcesTable.$inferSelect;

function rowToProvenance(row: Row): Provenance | null {
  if (!row.sourceName) return null;
  // DB constraint ensures external_id is non-null whenever source_name is set.
  // The cast below is safe: if this throws, the constraint was bypassed.
  return {
    sourceName: row.sourceName,
    externalId: row.externalId as string,
    externalUpdatedAt: row.externalUpdatedAt ?? null,
    raw: row.raw ?? null,
  };
}

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
    contact: row.contact ?? null,
    schedule: row.schedule ?? null,
    manager: row.manager ?? null,
    accepts: row.accepts ?? [],
    country: row.country ?? null,
    city: row.city ?? null,
    provenance: rowToProvenance(row),
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
        contact: s.contact,
        schedule: s.schedule,
        manager: s.manager,
        accepts: s.accepts,
        country: s.country,
        city: s.city,
        sourceName: s.provenance?.sourceName ?? null,
        externalId: s.provenance?.externalId ?? null,
        externalUpdatedAt: s.provenance?.externalUpdatedAt ?? null,
        raw: s.provenance?.raw ?? null,
      })
      .onConflictDoUpdate({
        target: resourcesTable.id,
        set: {
          verificationLevel: s.verificationLevel,
          publicStatus: s.publicStatus,
          name: s.name,
          contact: s.contact,
          schedule: s.schedule,
          manager: s.manager,
          accepts: s.accepts,
          country: s.country,
          city: s.city,
          sourceName: s.provenance?.sourceName ?? null,
          externalId: s.provenance?.externalId ?? null,
          externalUpdatedAt: s.provenance?.externalUpdatedAt ?? null,
          raw: s.provenance?.raw ?? null,
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
