import { createDb, Db } from '../../../../shared/db';
import { organizationsTable, organizationMembersTable } from './schema';
import {
  serviceAccountsTable,
  apiKeysTable,
  usersTable,
} from '../../../identity/infrastructure/drizzle/schema';
import { accreditationsTable } from '../../../accreditation/infrastructure/drizzle/schema';
import { DrizzleOrganizationRepository } from './drizzle-organization.repository';
import { DrizzleOrganizationMemberRepository } from './drizzle-organization-member.repository';
import { DrizzleUserDirectory } from './drizzle-user-directory';
import { DrizzleAccreditationRepository } from '../../../accreditation/infrastructure/drizzle/drizzle-accreditation.repository';
import { DrizzleServiceAccountRepository } from '../../../identity/infrastructure/drizzle/drizzle-service-account.repository';
import { DrizzleApiKeyRepository } from '../../../identity/infrastructure/drizzle/drizzle-api-key.repository';
import { AccreditationReaderAdapter } from '../accreditation-reader.adapter';
import { ServiceAccountReaderAdapter } from '../service-account-reader.adapter';
import { ListOrganizationsAdmin } from '../../application/list-organizations-admin';
import { GetOrganizationAdminDetail } from '../../application/get-organization-admin-detail';
import { Organization } from '../../domain/organization';
import { OrganizationId } from '../../domain/organization-id';
import {
  OrganizationType,
  OrganizationRole,
} from '../../domain/organization-enums';
import { ServiceAccount } from '../../../identity/domain/service-account';
import { ApiKey } from '../../../identity/domain/api-key';
import { Accreditation } from '../../../accreditation/domain/accreditation';
import { AccreditationScope } from '../../../accreditation/domain/value-objects/accreditation-scope';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';

const URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';

const OWNER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const MEMBER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const EMERGENCY_ID = '99999999-9999-4999-8999-999999999999';

describe('Organization admin reads (integration)', () => {
  let db: Db;
  let pool: Pool;
  let orgRepo: DrizzleOrganizationRepository;
  let memberRepo: DrizzleOrganizationMemberRepository;
  let userDirectory: DrizzleUserDirectory;
  let accreditationReader: AccreditationReaderAdapter;
  let serviceAccountReader: ServiceAccountReaderAdapter;
  let listAdmin: ListOrganizationsAdmin;
  let getDetail: GetOrganizationAdminDetail;

  beforeAll(() => {
    ({ db, pool } = createDb(URL));
    orgRepo = new DrizzleOrganizationRepository(db);
    memberRepo = new DrizzleOrganizationMemberRepository(db);
    userDirectory = new DrizzleUserDirectory(db);
    const accreditationRepo = new DrizzleAccreditationRepository(db);
    const serviceAccountRepo = new DrizzleServiceAccountRepository(db);
    const apiKeyRepo = new DrizzleApiKeyRepository(db);
    accreditationReader = new AccreditationReaderAdapter(accreditationRepo);
    serviceAccountReader = new ServiceAccountReaderAdapter(
      serviceAccountRepo,
      apiKeyRepo,
    );
    listAdmin = new ListOrganizationsAdmin(
      orgRepo,
      memberRepo,
      accreditationReader,
    );
    getDetail = new GetOrganizationAdminDetail(
      orgRepo,
      memberRepo,
      userDirectory,
      accreditationReader,
      serviceAccountReader,
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await db.delete(apiKeysTable);
    await db.delete(serviceAccountsTable);
    await db.delete(accreditationsTable);
    await db.delete(organizationMembersTable);
    await db.delete(organizationsTable);
    await db.delete(usersTable);
  });

  async function seedOrg(
    name: string,
    type: OrganizationType,
    taxId: string | null = null,
    contactEmail: string | null = null,
  ): Promise<string> {
    const org = Organization.create({
      id: OrganizationId.create(),
      name,
      type,
      taxId,
      contactEmail,
    });
    await orgRepo.save(org);
    return org.id.value;
  }

  it('lists all organizations with member count and accreditation status', async () => {
    const orgAId = await seedOrg(
      'Alpha',
      OrganizationType.Ngo,
      'A-1',
      'a@x.example',
    );
    const orgBId = await seedOrg('Beta', OrganizationType.Company);

    await memberRepo.add(orgAId, OWNER_ID, OrganizationRole.Owner);
    await memberRepo.add(orgAId, MEMBER_ID, OrganizationRole.Member);

    await new DrizzleAccreditationRepository(db).save(
      Accreditation.grant({
        id: randomUUID(),
        organizationId: orgAId,
        scope: AccreditationScope.global(),
        grantedByUserId: OWNER_ID,
      }),
    );

    const result = await listAdmin.execute();
    expect(result.map((o) => o.name)).toEqual(['Alpha', 'Beta']);

    const alpha = result.find((o) => o.id === orgAId)!;
    expect(alpha.memberCount).toBe(2);
    expect(alpha.accreditationStatus).toBe('global');
    expect(alpha.taxId).toBe('A-1');
    expect(alpha.contactEmail).toBe('a@x.example');

    const beta = result.find((o) => o.id === orgBId)!;
    expect(beta.memberCount).toBe(0);
    expect(beta.accreditationStatus).toBe('none');
  });

  it('returns full detail aggregating members, service accounts/keys, accreditations and emergencies', async () => {
    await db.insert(usersTable).values([
      { id: OWNER_ID, email: 'owner@x.example', name: 'Owner', isAdmin: false },
      {
        id: MEMBER_ID,
        email: 'member@x.example',
        name: 'Member',
        isAdmin: false,
      },
    ]);

    const orgId = await seedOrg(
      'Cruz Roja',
      OrganizationType.Ngo,
      'ES-1',
      'info@cr.example',
    );
    await memberRepo.add(orgId, OWNER_ID, OrganizationRole.Owner);
    await memberRepo.add(orgId, MEMBER_ID, OrganizationRole.Member);

    const accRepo = new DrizzleAccreditationRepository(db);
    await accRepo.save(
      Accreditation.grant({
        id: randomUUID(),
        organizationId: orgId,
        scope: AccreditationScope.forEmergency(EMERGENCY_ID),
        grantedByUserId: OWNER_ID,
        evidence: 'cert.pdf',
      }),
    );

    const saRepo = new DrizzleServiceAccountRepository(db);
    const keyRepo = new DrizzleApiKeyRepository(db);
    const saId = randomUUID();
    await saRepo.save(
      ServiceAccount.create({
        id: saId,
        name: 'Integración',
        ownerOrganizationId: orgId,
        createdByUserId: OWNER_ID,
      }),
    );
    // one active key, one revoked key
    await keyRepo.save(
      ApiKey.issue({
        id: randomUUID(),
        prefix: 'rh_live_active01',
        hashedSecret: 'h1',
        serviceAccountId: saId,
        createdByUserId: OWNER_ID,
      }),
    );
    const revoked = ApiKey.issue({
      id: randomUUID(),
      prefix: 'rh_live_revoked1',
      hashedSecret: 'h2',
      serviceAccountId: saId,
      createdByUserId: OWNER_ID,
    }).revoke(new Date());
    await keyRepo.save(revoked);

    const detail = await getDetail.execute({ organizationId: orgId });

    expect(detail.name).toBe('Cruz Roja');
    expect(detail.taxId).toBe('ES-1');
    expect(detail.accreditationStatus).toBe('emergency');
    expect(detail.emergencyIds).toEqual([EMERGENCY_ID]);

    expect(detail.members).toHaveLength(2);
    const owner = detail.members.find((m) => m.userId === OWNER_ID)!;
    expect(owner.role).toBe(OrganizationRole.Owner);
    expect(owner.email).toBe('owner@x.example');
    expect(owner.name).toBe('Owner');

    expect(detail.serviceAccounts).toHaveLength(1);
    expect(detail.serviceAccounts[0].keyCount).toBe(2);
    expect(detail.serviceAccounts[0].activeKeyCount).toBe(1);

    expect(detail.accreditations).toHaveLength(1);
    expect(detail.accreditations[0].evidence).toBe('cert.pdf');
  });
});
