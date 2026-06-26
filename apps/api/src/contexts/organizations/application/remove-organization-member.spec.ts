import { RemoveOrganizationMember } from './remove-organization-member';
import { InMemoryOrganizationRepository } from '../infrastructure/in-memory-organization.repository';
import { InMemoryOrganizationMemberRepository } from '../infrastructure/in-memory-organization-member.repository';
import { OrganizationType, OrganizationRole } from '../domain/organization-enums';
import { Organization } from '../domain/organization';
import { OrganizationId } from '../domain/organization-id';
import {
  NotOrganizationOwnerError,
  NotMemberError,
  CannotRemoveSelfError,
} from '../domain/errors';

const ORG_ID = 'aaaaaaaa-0000-4000-8000-000000000002';
const OWNER_ID = 'bbbbbbbb-0000-4000-8000-000000000002';
const MEMBER_ID = 'cccccccc-0000-4000-8000-000000000002';

function makeOrg(): Organization {
  return Organization.create({
    id: OrganizationId.fromString(ORG_ID),
    name: 'Test Org',
    type: OrganizationType.Ngo,
    taxId: null,
    contactEmail: null,
  });
}

describe('RemoveOrganizationMember', () => {
  let orgRepo: InMemoryOrganizationRepository;
  let memberRepo: InMemoryOrganizationMemberRepository;
  let useCase: RemoveOrganizationMember;

  beforeEach(async () => {
    orgRepo = new InMemoryOrganizationRepository();
    memberRepo = new InMemoryOrganizationMemberRepository(orgRepo);
    useCase = new RemoveOrganizationMember(memberRepo);

    await orgRepo.save(makeOrg());
    await memberRepo.add(ORG_ID, OWNER_ID, OrganizationRole.Owner);
    await memberRepo.add(ORG_ID, MEMBER_ID, OrganizationRole.Member);
  });

  it('removes a member when requester is owner', async () => {
    await useCase.execute({
      organizationId: ORG_ID,
      requesterUserId: OWNER_ID,
      targetUserId: MEMBER_ID,
    });

    const isMember = await memberRepo.isMember(ORG_ID, MEMBER_ID);
    expect(isMember).toBe(false);
  });

  it('throws NotOrganizationOwnerError when requester is a plain member', async () => {
    await expect(
      useCase.execute({
        organizationId: ORG_ID,
        requesterUserId: MEMBER_ID,
        targetUserId: OWNER_ID,
      }),
    ).rejects.toBeInstanceOf(NotOrganizationOwnerError);
  });

  it('throws CannotRemoveSelfError when owner tries to remove themselves', async () => {
    await expect(
      useCase.execute({
        organizationId: ORG_ID,
        requesterUserId: OWNER_ID,
        targetUserId: OWNER_ID,
      }),
    ).rejects.toBeInstanceOf(CannotRemoveSelfError);
  });

  it('throws NotMemberError when target user is not a member', async () => {
    await expect(
      useCase.execute({
        organizationId: ORG_ID,
        requesterUserId: OWNER_ID,
        targetUserId: 'nonexistent-user',
      }),
    ).rejects.toBeInstanceOf(NotMemberError);
  });
});
