import { OrganizationMemberRepository, OrganizationMemberEntry } from '../domain/ports/organization-member.repository';
import { OrganizationRole } from '../domain/organization-enums';
import { Organization } from '../domain/organization';
import { InMemoryOrganizationRepository } from './in-memory-organization.repository';
import { OrganizationId } from '../domain/organization-id';

interface StoreEntry {
  organizationId: string;
  userId: string;
  role: OrganizationRole;
}

export class InMemoryOrganizationMemberRepository implements OrganizationMemberRepository {
  // key: `orgId:userId`
  private store = new Map<string, StoreEntry>();

  constructor(private readonly orgRepo: InMemoryOrganizationRepository) {}

  private key(organizationId: string, userId: string): string {
    return `${organizationId}:${userId}`;
  }

  async add(organizationId: string, userId: string, role: OrganizationRole): Promise<void> {
    this.store.set(this.key(organizationId, userId), { organizationId, userId, role });
  }

  async listOrganizationsOfUser(userId: string): Promise<Organization[]> {
    const orgIds: string[] = [];
    for (const entry of this.store.values()) {
      if (entry.userId === userId) orgIds.push(entry.organizationId);
    }
    const results: Organization[] = [];
    for (const orgId of orgIds) {
      const org = await this.orgRepo.findById(OrganizationId.fromString(orgId));
      if (org) results.push(org);
    }
    return results;
  }

  async isMember(organizationId: string, userId: string): Promise<boolean> {
    return this.store.has(this.key(organizationId, userId));
  }

  async listMembers(organizationId: string): Promise<OrganizationMemberEntry[]> {
    const result: OrganizationMemberEntry[] = [];
    for (const entry of this.store.values()) {
      if (entry.organizationId === organizationId) {
        result.push({ userId: entry.userId, role: entry.role });
      }
    }
    return result;
  }

  async getRole(organizationId: string, userId: string): Promise<OrganizationRole | null> {
    const entry = this.store.get(this.key(organizationId, userId));
    return entry?.role ?? null;
  }

  async remove(organizationId: string, userId: string): Promise<void> {
    this.store.delete(this.key(organizationId, userId));
  }
}
