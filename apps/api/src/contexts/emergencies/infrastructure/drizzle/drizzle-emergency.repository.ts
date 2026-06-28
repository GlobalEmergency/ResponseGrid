import { eq, inArray } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { emergenciesTable } from './schema';
import { EmergencyRepository } from '../../domain/ports/emergency.repository';
import { Emergency, EmergencySnapshot } from '../../domain/emergency';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import { Slug } from '../../domain/slug';
import { EmergencyStatus } from '../../domain/emergency-status';

type Row = typeof emergenciesTable.$inferSelect;

function rowToSnapshot(row: Row): EmergencySnapshot {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    country: row.country,
    status: row.status as EmergencyStatus,
    announcement: row.announcement ?? null,
    dontBringList: row.dontBringList,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleEmergencyRepository implements EmergencyRepository {
  constructor(private readonly db: Db) {}

  async save(e: Emergency): Promise<void> {
    const s = e.toSnapshot();
    await this.db
      .insert(emergenciesTable)
      .values({
        id: s.id,
        name: s.name,
        slug: s.slug,
        country: s.country,
        status: s.status,
        announcement: s.announcement,
        dontBringList: s.dontBringList,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })
      .onConflictDoUpdate({
        target: emergenciesTable.id,
        set: {
          name: s.name,
          status: s.status,
          country: s.country,
          announcement: s.announcement,
          dontBringList: s.dontBringList,
          updatedAt: s.updatedAt,
        },
      });
  }

  async findById(id: EmergencyId): Promise<Emergency | null> {
    const rows = await this.db
      .select()
      .from(emergenciesTable)
      .where(eq(emergenciesTable.id, id.value))
      .limit(1);
    return rows[0] ? Emergency.fromSnapshot(rowToSnapshot(rows[0])) : null;
  }

  async findBySlug(slug: Slug): Promise<Emergency | null> {
    const rows = await this.db
      .select()
      .from(emergenciesTable)
      .where(eq(emergenciesTable.slug, slug.value));
    return rows[0] ? Emergency.fromSnapshot(rowToSnapshot(rows[0])) : null;
  }

  async findByIds(ids: EmergencyId[]): Promise<Emergency[]> {
    if (ids.length === 0) return [];
    const rows = await this.db
      .select()
      .from(emergenciesTable)
      .where(
        inArray(
          emergenciesTable.id,
          ids.map((id) => id.value),
        ),
      );
    return rows.map((r) => Emergency.fromSnapshot(rowToSnapshot(r)));
  }

  async listActive(): Promise<Emergency[]> {
    const rows = await this.db
      .select()
      .from(emergenciesTable)
      .where(eq(emergenciesTable.status, EmergencyStatus.Active));
    return rows.map((r) => Emergency.fromSnapshot(rowToSnapshot(r)));
  }
}
