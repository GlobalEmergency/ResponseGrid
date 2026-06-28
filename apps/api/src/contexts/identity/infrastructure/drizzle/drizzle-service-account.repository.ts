import { eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { serviceAccountsTable } from './schema';
import { ServiceAccountRepository } from '../../domain/ports/service-account.repository';
import { ServiceAccount } from '../../domain/service-account';

type Row = typeof serviceAccountsTable.$inferSelect;

function rowToServiceAccount(row: Row): ServiceAccount {
  return ServiceAccount.fromSnapshot({
    id: row.id,
    name: row.name,
    ownerOrganizationId: row.ownerOrganizationId,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
  });
}

export class DrizzleServiceAccountRepository implements ServiceAccountRepository {
  constructor(private readonly db: Db) {}

  async save(serviceAccount: ServiceAccount): Promise<void> {
    await this.db
      .insert(serviceAccountsTable)
      .values({
        id: serviceAccount.id,
        name: serviceAccount.name,
        ownerOrganizationId: serviceAccount.ownerOrganizationId,
        createdByUserId: serviceAccount.createdByUserId,
        createdAt: serviceAccount.createdAt,
      })
      .onConflictDoNothing({ target: serviceAccountsTable.id });
  }

  async findById(id: string): Promise<ServiceAccount | null> {
    const rows = await this.db
      .select()
      .from(serviceAccountsTable)
      .where(eq(serviceAccountsTable.id, id))
      .limit(1);
    return rows.length > 0 ? rowToServiceAccount(rows[0]) : null;
  }

  async listByOrganization(organizationId: string): Promise<ServiceAccount[]> {
    const rows = await this.db
      .select()
      .from(serviceAccountsTable)
      .where(eq(serviceAccountsTable.ownerOrganizationId, organizationId));
    return rows.map(rowToServiceAccount);
  }
}
