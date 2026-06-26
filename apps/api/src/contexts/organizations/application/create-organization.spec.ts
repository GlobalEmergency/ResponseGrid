import { CreateOrganization } from './create-organization';
import { InMemoryOrganizationRepository } from '../infrastructure/in-memory-organization.repository';
import { InMemoryOrganizationMemberRepository } from '../infrastructure/in-memory-organization-member.repository';
import { OrganizationType, OrganizationRole } from '../domain/organization-enums';
import { OrganizationId } from '../domain/organization-id';

describe('CreateOrganization', () => {
  it('creates an organization and returns its id', async () => {
    const orgRepo = new InMemoryOrganizationRepository();
    const memberRepo = new InMemoryOrganizationMemberRepository(orgRepo);
    const useCase = new CreateOrganization(orgRepo, memberRepo);

    const result = await useCase.execute({
      name: 'Red Cross',
      type: OrganizationType.Ngo,
      taxId: null,
      contactEmail: null,
      creatorUserId: 'aaaaaaaa-0000-4000-8000-000000000001',
    });

    expect(result.id).toBeTruthy();
    // verify it was saved
    const saved = await orgRepo.findById(OrganizationId.fromString(result.id));
    expect(saved).not.toBeNull();
    expect(saved?.name).toBe('Red Cross');
    expect(saved?.type).toBe(OrganizationType.Ngo);
  });

  it('associates the creator as Owner member', async () => {
    const orgRepo = new InMemoryOrganizationRepository();
    const memberRepo = new InMemoryOrganizationMemberRepository(orgRepo);
    const useCase = new CreateOrganization(orgRepo, memberRepo);
    const creatorUserId = 'bbbbbbbb-0000-4000-8000-000000000001';

    const { id } = await useCase.execute({
      name: 'FEMA',
      type: OrganizationType.PublicAdmin,
      taxId: null,
      contactEmail: null,
      creatorUserId,
    });

    const isMember = await memberRepo.isMember(id, creatorUserId);
    expect(isMember).toBe(true);

    const role = await memberRepo.getRole(id, creatorUserId);
    expect(role).toBe(OrganizationRole.Owner);
  });

  it('stores optional taxId and contactEmail', async () => {
    const orgRepo = new InMemoryOrganizationRepository();
    const memberRepo = new InMemoryOrganizationMemberRepository(orgRepo);
    const useCase = new CreateOrganization(orgRepo, memberRepo);

    const { id } = await useCase.execute({
      name: 'Acme Corp',
      type: OrganizationType.Company,
      taxId: 'ES-12345678',
      contactEmail: 'info@acme.example',
      creatorUserId: 'cccccccc-0000-4000-8000-000000000001',
    });

    const saved = await orgRepo.findById(OrganizationId.fromString(id));
    expect(saved?.taxId).toBe('ES-12345678');
    expect(saved?.contactEmail).toBe('info@acme.example');
  });

  it('sets verificationLevel to Unverified on creation', async () => {
    const orgRepo = new InMemoryOrganizationRepository();
    const memberRepo = new InMemoryOrganizationMemberRepository(orgRepo);
    const useCase = new CreateOrganization(orgRepo, memberRepo);

    const { id } = await useCase.execute({
      name: 'Greenpeace',
      type: OrganizationType.Association,
      taxId: null,
      contactEmail: null,
      creatorUserId: 'dddddddd-0000-4000-8000-000000000001',
    });

    const saved = await orgRepo.findById(OrganizationId.fromString(id));
    expect(saved?.verificationLevel).toBe('unverified');
  });
});
