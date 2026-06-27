import { eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { organizationsTable } from './schema';
import { OrganizationRepository } from '../../domain/ports/organization.repository';
import { Organization, OrganizationSnapshot } from '../../domain/organization';
import { OrganizationId } from '../../domain/organization-id';

type Row = typeof organizationsTable.$inferSelect;

function rowToSnapshot(row: Row): OrganizationSnapshot {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    taxId: row.taxId,
    contactEmail: row.contactEmail,
    verificationLevel: row.verificationLevel,
    createdAt: row.createdAt,
  };
}

export class DrizzleOrganizationRepository implements OrganizationRepository {
  constructor(private readonly db: Db) {}

  async save(organization: Organization): Promise<void> {
    const s = organization.toSnapshot();
    await this.db
      .insert(organizationsTable)
      .values({
        id: s.id,
        name: s.name,
        type: s.type,
        taxId: s.taxId,
        contactEmail: s.contactEmail,
        verificationLevel: s.verificationLevel,
        createdAt: s.createdAt,
      })
      .onConflictDoUpdate({
        target: organizationsTable.id,
        set: {
          name: s.name,
          type: s.type,
          taxId: s.taxId,
          contactEmail: s.contactEmail,
          verificationLevel: s.verificationLevel,
        },
      });
  }

  async findById(id: OrganizationId): Promise<Organization | null> {
    const rows = await this.db
      .select()
      .from(organizationsTable)
      .where(eq(organizationsTable.id, id.value))
      .limit(1);
    return rows[0] ? Organization.fromSnapshot(rowToSnapshot(rows[0])) : null;
  }

  async listAll(): Promise<Organization[]> {
    const rows = await this.db.select().from(organizationsTable);
    return rows.map((row) => Organization.fromSnapshot(rowToSnapshot(row)));
  }
}
