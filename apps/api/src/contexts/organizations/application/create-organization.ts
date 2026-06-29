import { OrganizationRepository } from '../domain/ports/organization.repository';
import { OrganizationMemberRepository } from '../domain/ports/organization-member.repository';
import { Organization } from '../domain/organization';
import { OrganizationId } from '../domain/organization-id';
import {
  OrganizationType,
  OrganizationRole,
} from '../domain/organization-enums';

export interface CreateOrganizationCommand {
  name: string;
  type: OrganizationType;
  taxId: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  creatorUserId: string;
}

export class CreateOrganization {
  constructor(
    private readonly orgRepo: OrganizationRepository,
    private readonly memberRepo: OrganizationMemberRepository,
  ) {}

  async execute(cmd: CreateOrganizationCommand): Promise<{ id: string }> {
    const id = OrganizationId.create();
    const org = Organization.create({
      id,
      name: cmd.name,
      type: cmd.type,
      taxId: cmd.taxId,
      contactEmail: cmd.contactEmail,
      contactPhone: cmd.contactPhone,
    });

    await this.orgRepo.save(org);
    await this.memberRepo.add(
      id.value,
      cmd.creatorUserId,
      OrganizationRole.Owner,
    );

    return { id: id.value };
  }
}
