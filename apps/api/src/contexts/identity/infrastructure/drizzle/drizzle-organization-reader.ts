import { eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import {
  OrganizationReader,
  UserOrganizationMembership,
} from '../../domain/ports/organization-reader';
// Cross-context infra coupling: the admin users console reads the organizations
// a user belongs to. Identity reads the organizations tables directly (names
// only) rather than importing the organizations module, which already depends
// on identity (importing it back would be a cycle). DIP-clean via the port.
import {
  organizationMembersTable,
  organizationsTable,
} from '../../../organizations/infrastructure/drizzle/schema';

export class DrizzleOrganizationReader implements OrganizationReader {
  constructor(private readonly db: Db) {}

  async listForUser(userId: string): Promise<UserOrganizationMembership[]> {
    const rows = await this.db
      .select({
        organizationId: organizationsTable.id,
        organizationName: organizationsTable.name,
        role: organizationMembersTable.role,
      })
      .from(organizationMembersTable)
      .innerJoin(
        organizationsTable,
        eq(organizationMembersTable.organizationId, organizationsTable.id),
      )
      .where(eq(organizationMembersTable.userId, userId));

    return rows.map((r) => ({
      organizationId: r.organizationId,
      organizationName: r.organizationName,
      role: r.role,
    }));
  }
}
