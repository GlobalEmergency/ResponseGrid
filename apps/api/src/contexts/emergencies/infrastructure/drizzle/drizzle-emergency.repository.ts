import { eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { emergenciesTable } from './schema';
import { EmergencyRepository } from '../../domain/ports/emergency.repository';
import { Emergency, EmergencySnapshot } from '../../domain/emergency';
import { EmergencyId } from '../../domain/emergency-id';
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
    createdAt: row.createdAt,
  };
}

export class DrizzleEmergencyRepository implements EmergencyRepository {
  constructor(private readonly db: Db) {}

  async save(e: Emergency): Promise<void> {
    const s = e.toSnapshot();
    await this.db
      .insert(emergenciesTable)
      .values(s)
      .onConflictDoUpdate({
        target: emergenciesTable.id,
        set: { name: s.name, status: s.status, country: s.country },
      });
  }

  async findById(id: EmergencyId): Promise<Emergency | null> {
    const rows = await this.db
      .select()
      .from(emergenciesTable)
      .where(eq(emergenciesTable.id, id.value));
    return rows[0] ? Emergency.fromSnapshot(rowToSnapshot(rows[0])) : null;
  }

  async findBySlug(slug: Slug): Promise<Emergency | null> {
    const rows = await this.db
      .select()
      .from(emergenciesTable)
      .where(eq(emergenciesTable.slug, slug.value));
    return rows[0] ? Emergency.fromSnapshot(rowToSnapshot(rows[0])) : null;
  }

  async listActive(): Promise<Emergency[]> {
    const rows = await this.db
      .select()
      .from(emergenciesTable)
      .where(eq(emergenciesTable.status, EmergencyStatus.Active));
    return rows.map((r) => Emergency.fromSnapshot(rowToSnapshot(r)));
  }
}
