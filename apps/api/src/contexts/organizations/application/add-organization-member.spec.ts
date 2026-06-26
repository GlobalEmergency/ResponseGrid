import { AddOrganizationMember } from './add-organization-member';
import { InMemoryOrganizationRepository } from '../infrastructure/in-memory-organization.repository';
import { InMemoryOrganizationMemberRepository } from '../infrastructure/in-memory-organization-member.repository';
import { InMemoryUserDirectory } from '../infrastructure/in-memory-user-directory';
import { OrganizationType, OrganizationRole } from '../domain/organization-enums';
import { Organization } from '../domain/organization';
import { OrganizationId } from '../domain/organization-id';
import {
  NotOrganizationOwnerError,
  UserNotFoundError,
  AlreadyMemberError,
} from '../domain/errors';

const ORG_ID = 'aaaaaaaa-0000-4000-8000-000000000001';
const OWNER_ID = 'bbbbbbbb-0000-4000-8000-000000000001';
const MEMBER_ID = 'cccccccc-0000-4000-8000-000000000001';
const MEMBER_EMAIL = 'member@example.com';

function makeOrg(id = ORG_ID): Organization {
  return Organization.create({
    id: OrganizationId.fromString(id),
    name: 'Test Org',
    type: OrganizationType.Ngo,
    taxId: null,
    contactEmail: null,
  });
}

describe('AddOrganizationMember', () => {
  let orgRepo: InMemoryOrganizationRepository;
  let memberRepo: InMemoryOrganizationMemberRepository;
  let userDirectory: InMemoryUserDirectory;
  let useCase: AddOrganizationMember;

  beforeEach(async () => {
    orgRepo = new InMemoryOrganizationRepository();
    memberRepo = new InMemoryOrganizationMemberRepository(orgRepo);
    userDirectory = new InMemoryUserDirectory();
    useCase = new AddOrganizationMember(memberRepo, userDirectory);

    await orgRepo.save(makeOrg());
    await memberRepo.add(ORG_ID, OWNER_ID, OrganizationRole.Owner);
    userDirectory.seed({ id: MEMBER_ID, email: MEMBER_EMAIL, name: 'New Member' });
  });

  it('adds a new member when requester is owner', async () => {
    await useCase.execute({
      organizationId: ORG_ID,
      requesterUserId: OWNER_ID,
      email: MEMBER_EMAIL,
    });

    const isMember = await memberRepo.isMember(ORG_ID, MEMBER_ID);
    expect(isMember).toBe(true);
    const role = await memberRepo.getRole(ORG_ID, MEMBER_ID);
    expect(role).toBe(OrganizationRole.Member);
  });

  it('throws NotOrganizationOwnerError when requester is not owner', async () => {
    await memberRepo.add(ORG_ID, MEMBER_ID, OrganizationRole.Member);

    await expect(
      useCase.execute({
        organizationId: ORG_ID,
        requesterUserId: MEMBER_ID,
        email: 'other@example.com',
      }),
    ).rejects.toBeInstanceOf(NotOrganizationOwnerError);
  });

  it('throws NotOrganizationOwnerError when requester is not a member at all', async () => {
    await expect(
      useCase.execute({
        organizationId: ORG_ID,
        requesterUserId: 'unknown-user-id',
        email: MEMBER_EMAIL,
      }),
    ).rejects.toBeInstanceOf(NotOrganizationOwnerError);
  });

  it('throws UserNotFoundError when email does not match any user', async () => {
    await expect(
      useCase.execute({
        organizationId: ORG_ID,
        requesterUserId: OWNER_ID,
        email: 'nonexistent@example.com',
      }),
    ).rejects.toBeInstanceOf(UserNotFoundError);
  });

  it('throws AlreadyMemberError when user is already a member', async () => {
    await memberRepo.add(ORG_ID, MEMBER_ID, OrganizationRole.Member);

    await expect(
      useCase.execute({
        organizationId: ORG_ID,
        requesterUserId: OWNER_ID,
        email: MEMBER_EMAIL,
      }),
    ).rejects.toBeInstanceOf(AlreadyMemberError);
  });
});
