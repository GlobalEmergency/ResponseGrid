import { Organization } from '../organization';
import { OrganizationRole } from '../organization-enums';

export const ORGANIZATION_MEMBER_REPOSITORY = Symbol('OrganizationMemberRepository');

export interface OrganizationMemberEntry {
  userId: string;
  role: OrganizationRole;
}

export interface OrganizationMemberRepository {
  add(organizationId: string, userId: string, role: OrganizationRole): Promise<void>;
  listOrganizationsOfUser(userId: string): Promise<Organization[]>;
  isMember(organizationId: string, userId: string): Promise<boolean>;
  listMembers(organizationId: string): Promise<OrganizationMemberEntry[]>;
  getRole(organizationId: string, userId: string): Promise<OrganizationRole | null>;
  remove(organizationId: string, userId: string): Promise<void>;
}
