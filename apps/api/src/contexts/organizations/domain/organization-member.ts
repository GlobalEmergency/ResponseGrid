import { OrganizationRole } from './organization-enums';

export interface OrganizationMemberSnapshot {
  organizationId: string;
  userId: string;
  role: OrganizationRole;
}

export class OrganizationMember {
  constructor(
    public readonly organizationId: string,
    public readonly userId: string,
    public readonly role: OrganizationRole,
  ) {}

  static create(
    organizationId: string,
    userId: string,
    role: OrganizationRole,
  ): OrganizationMember {
    return new OrganizationMember(organizationId, userId, role);
  }

  static fromSnapshot(snap: OrganizationMemberSnapshot): OrganizationMember {
    return new OrganizationMember(snap.organizationId, snap.userId, snap.role);
  }

  toSnapshot(): OrganizationMemberSnapshot {
    return { organizationId: this.organizationId, userId: this.userId, role: this.role };
  }
}
