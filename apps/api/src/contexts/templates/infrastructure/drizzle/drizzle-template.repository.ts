import { eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { templatesTable } from './schema';
import { TemplateRepository } from '../../domain/ports/template.repository';
import { Template, TemplateSnapshot } from '../../domain/template';
import { TemplateId } from '../../domain/template-id';

type Row = typeof templatesTable.$inferSelect;

function rowToSnapshot(row: Row): TemplateSnapshot {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    dontBringList: row.dontBringList,
    defaultAnnouncement: row.defaultAnnouncement ?? null,
    createdAt: row.createdAt,
  };
}

export class DrizzleTemplateRepository implements TemplateRepository {
  constructor(private readonly db: Db) {}

  async save(t: Template): Promise<void> {
    const s = t.toSnapshot();
    await this.db
      .insert(templatesTable)
      .values({
        id: s.id,
        name: s.name,
        description: s.description,
        dontBringList: s.dontBringList,
        defaultAnnouncement: s.defaultAnnouncement,
        createdAt: s.createdAt,
      })
      .onConflictDoUpdate({
        target: templatesTable.id,
        set: {
          name: s.name,
          description: s.description,
          dontBringList: s.dontBringList,
          defaultAnnouncement: s.defaultAnnouncement,
        },
      });
  }

  async findById(id: TemplateId): Promise<Template | null> {
    const rows = await this.db
      .select()
      .from(templatesTable)
      .where(eq(templatesTable.id, id.value))
      .limit(1);
    return rows[0] ? Template.fromSnapshot(rowToSnapshot(rows[0])) : null;
  }

  async listAll(): Promise<Template[]> {
    const rows = await this.db.select().from(templatesTable);
    return rows.map((r) => Template.fromSnapshot(rowToSnapshot(r)));
  }

  async delete(id: TemplateId): Promise<void> {
    await this.db.delete(templatesTable).where(eq(templatesTable.id, id.value));
  }
}
