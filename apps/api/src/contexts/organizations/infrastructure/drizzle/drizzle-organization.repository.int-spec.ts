import { createDb, Db } from '../../../../shared/db';
import { organizationsTable, organizationMembersTable } from './schema';
import { DrizzleOrganizationRepository } from './drizzle-organization.repository';
import { DrizzleOrganizationMemberRepository } from './drizzle-organization-member.repository';
import { Organization } from '../../domain/organization';
import { OrganizationId } from '../../domain/organization-id';
import {
  OrganizationType,
  VerificationLevel,
} from '../../domain/organization-enums';
import type { Pool } from 'pg';

const URL =
  process.env.DATABASE_URL ??
  'postgres://reliefhub:reliefhub@localhost:5433/reliefhub';
const USER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('DrizzleOrganizationRepository (integration)', () => {
  let db: Db;
  let pool: Pool;
  let orgRepo: DrizzleOrganizationRepository;
  let _memberRepo: DrizzleOrganizationMemberRepository;

  beforeAll(() => {
    ({ db, pool } = createDb(URL));
    orgRepo = new DrizzleOrganizationRepository(db);
    _memberRepo = new DrizzleOrganizationMemberRepository(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await db.delete(organizationMembersTable);
    await db.delete(organizationsTable);
  });

  it('round-trips an organization through Postgres', async () => {
    const org = Organization.create({
      id: OrganizationId.create(),
      name: 'Cruz Roja',
      type: OrganizationType.Ngo,
      taxId: 'ES-12345678',
      contactEmail: 'info@cruzroja.es',
      contactPhone: '+58 412-1234567',
    });
    await orgRepo.save(org);
    const found = await orgRepo.findById(org.id);
    expect(found?.name).toBe('Cruz Roja');
    expect(found?.type).toBe(OrganizationType.Ngo);
    expect(found?.taxId).toBe('ES-12345678');
    expect(found?.contactEmail).toBe('info@cruzroja.es');
    expect(found?.contactPhone).toBe('+58 412-1234567');
    expect(found?.verificationLevel).toBe(VerificationLevel.Unverified);
  });

  it('listAll returns all saved organizations', async () => {
    const org1 = Organization.create({
      id: OrganizationId.create(),
      name: 'Org 1',
      type: OrganizationType.Ngo,
      taxId: null,
      contactEmail: null,
      contactPhone: null,
    });
    const org2 = Organization.create({
      id: OrganizationId.create(),
      name: 'Org 2',
      type: OrganizationType.Company,
      taxId: null,
      contactEmail: null,
      contactPhone: null,
    });
    await orgRepo.save(org1);
    await orgRepo.save(org2);

    const all = await orgRepo.listAll();
    expect(all).toHaveLength(2);
    expect(all.map((o) => o.name)).toContain('Org 1');
    expect(all.map((o) => o.name)).toContain('Org 2');
  });

  it('findById returns null for unknown id', async () => {
    const result = await orgRepo.findById(OrganizationId.create());
    expect(result).toBeNull();
  });
});

describe('DrizzleOrganizationMemberRepository (integration)', () => {
  let db: Db;
  let pool: Pool;
  let orgRepo: DrizzleOrganizationRepository;
  let memberRepo: DrizzleOrganizationMemberRepository;

  beforeAll(() => {
    ({ db, pool } = createDb(URL));
    orgRepo = new DrizzleOrganizationRepository(db);
    memberRepo = new DrizzleOrganizationMemberRepository(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await db.delete(organizationMembersTable);
    await db.delete(organizationsTable);
  });

  it('adds a member and reports isMember correctly', async () => {
    const org = Organization.create({
      id: OrganizationId.create(),
      name: 'Org',
      type: OrganizationType.Ngo,
      taxId: null,
      contactEmail: null,
      contactPhone: null,
    });
    await orgRepo.save(org);

    await memberRepo.add(org.id.value, USER_A);

    expect(await memberRepo.isMember(org.id.value, USER_A)).toBe(true);
    expect(await memberRepo.isMember(org.id.value, USER_B)).toBe(false);
  });

  it('listOrganizationsOfUser returns only the user orgs', async () => {
    const org1 = Organization.create({
      id: OrganizationId.create(),
      name: 'Mine',
      type: OrganizationType.Ngo,
      taxId: null,
      contactEmail: null,
      contactPhone: null,
    });
    const org2 = Organization.create({
      id: OrganizationId.create(),
      name: 'Others',
      type: OrganizationType.Company,
      taxId: null,
      contactEmail: null,
      contactPhone: null,
    });
    await orgRepo.save(org1);
    await orgRepo.save(org2);
    await memberRepo.add(org1.id.value, USER_A);
    await memberRepo.add(org2.id.value, USER_B);

    const mine = await memberRepo.listOrganizationsOfUser(USER_A);
    expect(mine).toHaveLength(1);
    expect(mine[0].name).toBe('Mine');
  });

  it('add is idempotent (no duplicate error on second add)', async () => {
    const org = Organization.create({
      id: OrganizationId.create(),
      name: 'Idempotent',
      type: OrganizationType.Other,
      taxId: null,
      contactEmail: null,
      contactPhone: null,
    });
    await orgRepo.save(org);

    await memberRepo.add(org.id.value, USER_A);
    await expect(memberRepo.add(org.id.value, USER_A)).resolves.not.toThrow();
    expect(await memberRepo.isMember(org.id.value, USER_A)).toBe(true);
  });
});
