import { and, eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { resourcesTable } from './schema';
import { ResourceRepository } from '../../domain/ports/resource.repository';
import { Resource, ResourceSnapshot } from '../../domain/resource';
import { ResourceId } from '../../domain/resource-id';
import { EmergencyId } from '../../domain/emergency-id';
import { ResourceType, ResourceSide, VerificationLevel, PublicStatus } from '../../domain/resource-enums';

type Row = typeof resourcesTable.$inferSelect;

function rowToSnapshot(row: Row): ResourceSnapshot {
  return {
    id: row.id,
    emergencyId: row.emergencyId,
    type: row.type as ResourceType,
    side: row.side as ResourceSide,
    name: row.name,
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
      .values(s)
      .onConflictDoUpdate({
        target: resourcesTable.id,
        set: { verificationLevel: s.verificationLevel, publicStatus: s.publicStatus, name: s.name },
      });
  }

  async findById(id: ResourceId): Promise<Resource | null> {
    const rows = await this.db.select().from(resourcesTable).where(eq(resourcesTable.id, id.value));
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
}
