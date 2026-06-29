import { ListOrganizationMembers } from './list-organization-members';
import { InMemoryOrganizationRepository } from '../infrastructure/in-memory-organization.repository';
import { InMemoryOrganizationMemberRepository } from '../infrastructure/in-memory-organization-member.repository';
import { InMemoryUserDirectory } from '../infrastructure/in-memory-user-directory';
import {
  OrganizationType,
  OrganizationRole,
} from '../domain/organization-enums';
import { Organization } from '../domain/organization';
import { OrganizationId } from '../domain/organization-id';
import { NotMemberError } from '../domain/errors';

const ORG_ID = 'aaaaaaaa-0000-4000-8000-000000000003';
const OWNER_ID = 'bbbbbbbb-0000-4000-8000-000000000003';
const MEMBER_ID = 'cccccccc-0000-4000-8000-000000000003';

function makeOrg(): Organization {
  return Organization.create({
    id: OrganizationId.fromString(ORG_ID),
    name: 'Test Org',
    type: OrganizationType.Ngo,
    taxId: null,
    contactEmail: null,
    contactPhone: null,
  });
}

describe('ListOrganizationMembers', () => {
  let orgRepo: InMemoryOrganizationRepository;
  let memberRepo: InMemoryOrganizationMemberRepository;
  let userDirectory: InMemoryUserDirectory;
  let useCase: ListOrganizationMembers;

  beforeEach(async () => {
    orgRepo = new InMemoryOrganizationRepository();
    memberRepo = new InMemoryOrganizationMemberRepository(orgRepo);
    userDirectory = new InMemoryUserDirectory();
    useCase = new ListOrganizationMembers(memberRepo, userDirectory);

    await orgRepo.save(makeOrg());
    await memberRepo.add(ORG_ID, OWNER_ID, OrganizationRole.Owner);
    await memberRepo.add(ORG_ID, MEMBER_ID, OrganizationRole.Member);
    userDirectory.seed({
      id: OWNER_ID,
      email: 'owner@example.com',
      name: 'Owner',
    });
    userDirectory.seed({
      id: MEMBER_ID,
      email: 'member@example.com',
      name: 'Member',
    });
  });

  it('returns all members with their roles when requester is a member', async () => {
    const result = await useCase.execute({
      organizationId: ORG_ID,
      requesterUserId: OWNER_ID,
    });

    expect(result).toHaveLength(2);
    const owner = result.find((m) => m.userId === OWNER_ID);
    const member = result.find((m) => m.userId === MEMBER_ID);
    expect(owner?.role).toBe(OrganizationRole.Owner);
    expect(owner?.email).toBe('owner@example.com');
    expect(member?.role).toBe(OrganizationRole.Member);
    expect(member?.email).toBe('member@example.com');
  });

  it('is also accessible to plain members', async () => {
    const result = await useCase.execute({
      organizationId: ORG_ID,
      requesterUserId: MEMBER_ID,
    });
    expect(result).toHaveLength(2);
  });

  it('throws NotMemberError when requester is not a member', async () => {
    await expect(
      useCase.execute({
        organizationId: ORG_ID,
        requesterUserId: 'not-a-member',
      }),
    ).rejects.toBeInstanceOf(NotMemberError);
  });
});
