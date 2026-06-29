import { eq, and } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { organizationsTable, organizationMembersTable } from './schema';
import {
  OrganizationMemberRepository,
  OrganizationMemberEntry,
} from '../../domain/ports/organization-member.repository';
import { OrganizationRole } from '../../domain/organization-enums';
import { Organization, OrganizationSnapshot } from '../../domain/organization';

type OrgRow = typeof organizationsTable.$inferSelect;

function rowToSnapshot(row: OrgRow): OrganizationSnapshot {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    taxId: row.taxId,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    verificationLevel: row.verificationLevel,
    createdAt: row.createdAt,
  };
}

export class DrizzleOrganizationMemberRepository implements OrganizationMemberRepository {
  constructor(private readonly db: Db) {}

  async add(
    organizationId: string,
    userId: string,
    role: OrganizationRole,
  ): Promise<void> {
    await this.db
      .insert(organizationMembersTable)
      .values({ organizationId, userId, role })
      .onConflictDoNothing();
  }

  async listOrganizationsOfUser(userId: string): Promise<Organization[]> {
    const rows = await this.db
      .select({ org: organizationsTable })
      .from(organizationMembersTable)
      .innerJoin(
        organizationsTable,
        eq(organizationMembersTable.organizationId, organizationsTable.id),
      )
      .where(eq(organizationMembersTable.userId, userId));
    return rows.map((r) => Organization.fromSnapshot(rowToSnapshot(r.org)));
  }

  async isMember(organizationId: string, userId: string): Promise<boolean> {
    const rows = await this.db
      .select()
      .from(organizationMembersTable)
      .where(
        and(
          eq(organizationMembersTable.organizationId, organizationId),
          eq(organizationMembersTable.userId, userId),
        ),
      );
    return rows.length > 0;
  }

  async listMembers(
    organizationId: string,
  ): Promise<OrganizationMemberEntry[]> {
    const rows = await this.db
      .select({
        userId: organizationMembersTable.userId,
        role: organizationMembersTable.role,
      })
      .from(organizationMembersTable)
      .where(eq(organizationMembersTable.organizationId, organizationId));
    return rows.map((r) => ({
      userId: r.userId,
      role: r.role as OrganizationRole,
    }));
  }

  async getRole(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationRole | null> {
    const rows = await this.db
      .select({ role: organizationMembersTable.role })
      .from(organizationMembersTable)
      .where(
        and(
          eq(organizationMembersTable.organizationId, organizationId),
          eq(organizationMembersTable.userId, userId),
        ),
      );
    if (!rows[0]) return null;
    return rows[0].role as OrganizationRole;
  }

  async remove(organizationId: string, userId: string): Promise<void> {
    await this.db
      .delete(organizationMembersTable)
      .where(
        and(
          eq(organizationMembersTable.organizationId, organizationId),
          eq(organizationMembersTable.userId, userId),
        ),
      );
  }
}
