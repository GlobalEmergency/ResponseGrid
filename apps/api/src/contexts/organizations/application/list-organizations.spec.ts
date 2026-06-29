import { ListOrganizations } from './list-organizations';
import { ListMyOrganizations } from './list-my-organizations';
import { CreateOrganization } from './create-organization';
import { InMemoryOrganizationRepository } from '../infrastructure/in-memory-organization.repository';
import { InMemoryOrganizationMemberRepository } from '../infrastructure/in-memory-organization-member.repository';
import { OrganizationType } from '../domain/organization-enums';

describe('ListOrganizations', () => {
  it('returns empty array when no organizations exist', async () => {
    const orgRepo = new InMemoryOrganizationRepository();
    const useCase = new ListOrganizations(orgRepo);

    const result = await useCase.execute();
    expect(result).toEqual([]);
  });

  it('returns all organizations as views', async () => {
    const orgRepo = new InMemoryOrganizationRepository();
    const memberRepo = new InMemoryOrganizationMemberRepository(orgRepo);
    const createUseCase = new CreateOrganization(orgRepo, memberRepo);
    const listUseCase = new ListOrganizations(orgRepo);

    await createUseCase.execute({
      name: 'Org A',
      type: OrganizationType.Ngo,
      taxId: null,
      contactEmail: null,
      contactPhone: null,
      creatorUserId: 'aaaaaaaa-0000-4000-8000-000000000001',
    });
    await createUseCase.execute({
      name: 'Org B',
      type: OrganizationType.Company,
      taxId: null,
      contactEmail: null,
      contactPhone: null,
      creatorUserId: 'bbbbbbbb-0000-4000-8000-000000000001',
    });

    const result = await listUseCase.execute();
    expect(result).toHaveLength(2);
    expect(result.map((o) => o.name)).toContain('Org A');
    expect(result.map((o) => o.name)).toContain('Org B');
  });
});

describe('ListMyOrganizations', () => {
  it('returns only the organizations the user belongs to', async () => {
    const orgRepo = new InMemoryOrganizationRepository();
    const memberRepo = new InMemoryOrganizationMemberRepository(orgRepo);
    const createUseCase = new CreateOrganization(orgRepo, memberRepo);
    const listMine = new ListMyOrganizations(memberRepo);

    const userId1 = 'aaaaaaaa-0000-4000-8000-000000000001';
    const userId2 = 'bbbbbbbb-0000-4000-8000-000000000001';

    await createUseCase.execute({
      name: 'My Org',
      type: OrganizationType.Ngo,
      taxId: null,
      contactEmail: null,
      contactPhone: null,
      creatorUserId: userId1,
    });
    await createUseCase.execute({
      name: 'Other Org',
      type: OrganizationType.Company,
      taxId: null,
      contactEmail: null,
      contactPhone: null,
      creatorUserId: userId2,
    });

    const result = await listMine.execute({ userId: userId1 });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('My Org');
  });

  it('returns empty array if user has no organizations', async () => {
    const orgRepo = new InMemoryOrganizationRepository();
    const memberRepo = new InMemoryOrganizationMemberRepository(orgRepo);
    const listMine = new ListMyOrganizations(memberRepo);

    const result = await listMine.execute({
      userId: 'ffffffff-0000-4000-8000-000000000001',
    });
    expect(result).toEqual([]);
  });
});
