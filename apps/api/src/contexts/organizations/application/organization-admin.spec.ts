import { ListOrganizationsAdmin } from './list-organizations-admin';
import { GetOrganizationAdminDetail } from './get-organization-admin-detail';
import { CreateOrganization } from './create-organization';
import { InMemoryOrganizationRepository } from '../infrastructure/in-memory-organization.repository';
import { InMemoryOrganizationMemberRepository } from '../infrastructure/in-memory-organization-member.repository';
import { InMemoryUserDirectory } from '../infrastructure/in-memory-user-directory';
import {
  OrganizationType,
  OrganizationRole,
} from '../domain/organization-enums';
import { OrganizationNotFoundError } from '../domain/errors';
import {
  AccreditationReader,
  OrganizationAccreditation,
} from '../domain/ports/accreditation-reader';
import {
  ServiceAccountReader,
  OrganizationServiceAccount,
} from '../domain/ports/service-account-reader';

class FakeAccreditationReader implements AccreditationReader {
  private byOrg = new Map<string, OrganizationAccreditation[]>();

  set(organizationId: string, accs: OrganizationAccreditation[]): void {
    this.byOrg.set(organizationId, accs);
  }

  listForOrganization(
    organizationId: string,
  ): Promise<OrganizationAccreditation[]> {
    return Promise.resolve(this.byOrg.get(organizationId) ?? []);
  }
}

class FakeServiceAccountReader implements ServiceAccountReader {
  private byOrg = new Map<string, OrganizationServiceAccount[]>();

  set(organizationId: string, sas: OrganizationServiceAccount[]): void {
    this.byOrg.set(organizationId, sas);
  }

  listForOrganization(
    organizationId: string,
  ): Promise<OrganizationServiceAccount[]> {
    return Promise.resolve(this.byOrg.get(organizationId) ?? []);
  }
}

const EMERGENCY_ID = '99999999-9999-4999-8999-999999999999';

async function seedOrg(
  create: CreateOrganization,
  name: string,
  type: OrganizationType,
  creatorUserId: string,
  opts: { taxId?: string | null; contactEmail?: string | null } = {},
): Promise<string> {
  const { id } = await create.execute({
    name,
    type,
    taxId: opts.taxId ?? null,
    contactEmail: opts.contactEmail ?? null,
    creatorUserId,
  });
  return id;
}

describe('ListOrganizationsAdmin', () => {
  it('returns an empty list when there are no organizations', async () => {
    const orgRepo = new InMemoryOrganizationRepository();
    const memberRepo = new InMemoryOrganizationMemberRepository(orgRepo);
    const accreditations = new FakeAccreditationReader();
    const useCase = new ListOrganizationsAdmin(
      orgRepo,
      memberRepo,
      accreditations,
    );

    expect(await useCase.execute()).toEqual([]);
  });

  it('lists every organization with member count and accreditation status, sorted by name', async () => {
    const orgRepo = new InMemoryOrganizationRepository();
    const memberRepo = new InMemoryOrganizationMemberRepository(orgRepo);
    const create = new CreateOrganization(orgRepo, memberRepo);
    const accreditations = new FakeAccreditationReader();
    const useCase = new ListOrganizationsAdmin(
      orgRepo,
      memberRepo,
      accreditations,
    );

    const ownerB = 'bbbbbbbb-0000-4000-8000-000000000001';
    const ownerA = 'aaaaaaaa-0000-4000-8000-000000000001';

    const orgBId = await seedOrg(
      create,
      'Zebra Aid',
      OrganizationType.Ngo,
      ownerB,
      {
        taxId: 'B-1',
        contactEmail: 'z@aid.example',
      },
    );
    const orgAId = await seedOrg(
      create,
      'Alpha Relief',
      OrganizationType.Company,
      ownerA,
    );

    // org A gets a second member (creator already counts as one)
    await memberRepo.add(
      orgAId,
      'cccccccc-0000-4000-8000-000000000001',
      OrganizationRole.Member,
    );

    accreditations.set(orgAId, [
      {
        id: 'acc-1',
        scope: 'global',
        grantedByUserId: ownerA,
        grantedAt: '2026-01-01T00:00:00.000Z',
        evidence: null,
      },
    ]);
    // org B has none

    const result = await useCase.execute();

    expect(result.map((o) => o.name)).toEqual(['Alpha Relief', 'Zebra Aid']);

    const alpha = result.find((o) => o.id === orgAId)!;
    expect(alpha.memberCount).toBe(2);
    expect(alpha.accreditationStatus).toBe('global');
    expect(alpha.type).toBe(OrganizationType.Company);

    const zebra = result.find((o) => o.id === orgBId)!;
    expect(zebra.memberCount).toBe(1);
    expect(zebra.accreditationStatus).toBe('none');
    expect(zebra.taxId).toBe('B-1');
    expect(zebra.contactEmail).toBe('z@aid.example');
  });

  it('reports emergency accreditation status when only emergency-scoped accreditations exist', async () => {
    const orgRepo = new InMemoryOrganizationRepository();
    const memberRepo = new InMemoryOrganizationMemberRepository(orgRepo);
    const create = new CreateOrganization(orgRepo, memberRepo);
    const accreditations = new FakeAccreditationReader();
    const useCase = new ListOrganizationsAdmin(
      orgRepo,
      memberRepo,
      accreditations,
    );

    const orgId = await seedOrg(
      create,
      'Org',
      OrganizationType.Ngo,
      'dddddddd-0000-4000-8000-000000000001',
    );
    accreditations.set(orgId, [
      {
        id: 'acc-2',
        scope: { emergencyId: EMERGENCY_ID },
        grantedByUserId: 'dddddddd-0000-4000-8000-000000000001',
        grantedAt: '2026-01-02T00:00:00.000Z',
        evidence: 'doc',
      },
    ]);

    const [item] = await useCase.execute();
    expect(item.accreditationStatus).toBe('emergency');
  });
});

describe('GetOrganizationAdminDetail', () => {
  function buildUseCase() {
    const orgRepo = new InMemoryOrganizationRepository();
    const memberRepo = new InMemoryOrganizationMemberRepository(orgRepo);
    const userDirectory = new InMemoryUserDirectory();
    const accreditations = new FakeAccreditationReader();
    const serviceAccounts = new FakeServiceAccountReader();
    const create = new CreateOrganization(orgRepo, memberRepo);
    const useCase = new GetOrganizationAdminDetail(
      orgRepo,
      memberRepo,
      userDirectory,
      accreditations,
      serviceAccounts,
    );
    return {
      orgRepo,
      memberRepo,
      userDirectory,
      accreditations,
      serviceAccounts,
      create,
      useCase,
    };
  }

  it('throws OrganizationNotFoundError for an unknown organization', async () => {
    const { useCase } = buildUseCase();
    await expect(
      useCase.execute({
        organizationId: '11111111-1111-4111-8111-111111111111',
      }),
    ).rejects.toBeInstanceOf(OrganizationNotFoundError);
  });

  it('throws on an invalid (non-UUID) organization id', async () => {
    const { useCase } = buildUseCase();
    await expect(
      useCase.execute({ organizationId: 'not-a-uuid' }),
    ).rejects.toThrow();
  });

  it('aggregates members (with roles + user details), service accounts, accreditations and emergencies', async () => {
    const {
      memberRepo,
      userDirectory,
      accreditations,
      serviceAccounts,
      create,
      useCase,
    } = buildUseCase();

    const ownerId = 'aaaaaaaa-0000-4000-8000-000000000001';
    const memberId = 'bbbbbbbb-0000-4000-8000-000000000001';
    userDirectory.seed({
      id: ownerId,
      email: 'owner@org.example',
      name: 'Owner One',
    });
    userDirectory.seed({
      id: memberId,
      email: 'member@org.example',
      name: 'Member Two',
    });

    const orgId = await seedOrg(
      create,
      'Cruz Roja',
      OrganizationType.Ngo,
      ownerId,
      {
        taxId: 'ES-1',
        contactEmail: 'info@cruzroja.example',
      },
    );
    await memberRepo.add(orgId, memberId, OrganizationRole.Member);

    accreditations.set(orgId, [
      {
        id: 'acc-1',
        scope: { emergencyId: EMERGENCY_ID },
        grantedByUserId: ownerId,
        grantedAt: '2026-02-01T00:00:00.000Z',
        evidence: null,
      },
    ]);
    serviceAccounts.set(orgId, [
      {
        id: 'sa-1',
        name: 'Integración',
        createdAt: '2026-01-10T00:00:00.000Z',
        keyCount: 3,
        activeKeyCount: 1,
      },
    ]);

    const detail = await useCase.execute({ organizationId: orgId });

    expect(detail.id).toBe(orgId);
    expect(detail.name).toBe('Cruz Roja');
    expect(detail.taxId).toBe('ES-1');
    expect(detail.contactEmail).toBe('info@cruzroja.example');
    expect(detail.accreditationStatus).toBe('emergency');

    expect(detail.members).toHaveLength(2);
    const owner = detail.members.find((m) => m.userId === ownerId)!;
    expect(owner.role).toBe(OrganizationRole.Owner);
    expect(owner.email).toBe('owner@org.example');
    expect(owner.name).toBe('Owner One');

    expect(detail.serviceAccounts).toEqual([
      {
        id: 'sa-1',
        name: 'Integración',
        createdAt: '2026-01-10T00:00:00.000Z',
        keyCount: 3,
        activeKeyCount: 1,
      },
    ]);

    expect(detail.accreditations).toHaveLength(1);
    expect(detail.emergencyIds).toEqual([EMERGENCY_ID]);
  });

  it('tolerates members whose user record is missing from the directory', async () => {
    const { memberRepo, create, useCase } = buildUseCase();
    const ownerId = 'aaaaaaaa-0000-4000-8000-000000000001';
    const orgId = await seedOrg(create, 'Org', OrganizationType.Other, ownerId);
    await memberRepo.add(
      orgId,
      'cccccccc-0000-4000-8000-000000000001',
      OrganizationRole.Member,
    );

    const detail = await useCase.execute({ organizationId: orgId });
    expect(detail.members).toHaveLength(2);
    // owner has no seeded directory entry either → empty email/name, no throw
    expect(detail.members.every((m) => typeof m.email === 'string')).toBe(true);
  });

  it('deduplicates emergencies across multiple accreditations and ignores global scope', async () => {
    const { accreditations, create, useCase } = buildUseCase();
    const ownerId = 'aaaaaaaa-0000-4000-8000-000000000001';
    const orgId = await seedOrg(create, 'Org', OrganizationType.Ngo, ownerId);
    accreditations.set(orgId, [
      {
        id: 'a1',
        scope: { emergencyId: EMERGENCY_ID },
        grantedByUserId: ownerId,
        grantedAt: '2026-02-01T00:00:00.000Z',
        evidence: null,
      },
      {
        id: 'a2',
        scope: { emergencyId: EMERGENCY_ID },
        grantedByUserId: ownerId,
        grantedAt: '2026-02-02T00:00:00.000Z',
        evidence: null,
      },
      {
        id: 'a3',
        scope: 'global',
        grantedByUserId: ownerId,
        grantedAt: '2026-02-03T00:00:00.000Z',
        evidence: null,
      },
    ]);

    const detail = await useCase.execute({ organizationId: orgId });
    expect(detail.emergencyIds).toEqual([EMERGENCY_ID]);
    expect(detail.accreditationStatus).toBe('global');
  });
});
