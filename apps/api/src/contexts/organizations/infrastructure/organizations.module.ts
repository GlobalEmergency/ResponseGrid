import { Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { Db, createDb } from '../../../shared/db';
import { IdentityModule } from '../../identity/infrastructure/identity.module';
import { ORGANIZATION_REPOSITORY, OrganizationRepository } from '../domain/ports/organization.repository';
import { ORGANIZATION_MEMBER_REPOSITORY, OrganizationMemberRepository } from '../domain/ports/organization-member.repository';
import { USER_DIRECTORY, UserDirectory } from '../domain/ports/user-directory';
import { DrizzleOrganizationRepository } from './drizzle/drizzle-organization.repository';
import { DrizzleOrganizationMemberRepository } from './drizzle/drizzle-organization-member.repository';
import { DrizzleUserDirectory } from './drizzle/drizzle-user-directory';
import { CreateOrganization } from '../application/create-organization';
import { ListMyOrganizations } from '../application/list-my-organizations';
import { ListOrganizations } from '../application/list-organizations';
import { AddOrganizationMember } from '../application/add-organization-member';
import { RemoveOrganizationMember } from '../application/remove-organization-member';
import { ListOrganizationMembers } from '../application/list-organization-members';
import { OrganizationsController } from './http/organizations.controller';

export const ORGANIZATIONS_DB_POOL = Symbol('ORGANIZATIONS_DB_POOL');

interface DbPool {
  db: Db;
  pool: Pool;
}

const dbPoolProvider = {
  provide: ORGANIZATIONS_DB_POOL,
  useFactory: (): DbPool => {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is required');
    return createDb(url);
  },
};

const organizationRepositoryProvider = {
  provide: ORGANIZATION_REPOSITORY,
  inject: [ORGANIZATIONS_DB_POOL],
  useFactory: (dbPool: DbPool): OrganizationRepository =>
    new DrizzleOrganizationRepository(dbPool.db),
};

const organizationMemberRepositoryProvider = {
  provide: ORGANIZATION_MEMBER_REPOSITORY,
  inject: [ORGANIZATIONS_DB_POOL],
  useFactory: (dbPool: DbPool): OrganizationMemberRepository =>
    new DrizzleOrganizationMemberRepository(dbPool.db),
};

const userDirectoryProvider = {
  provide: USER_DIRECTORY,
  inject: [ORGANIZATIONS_DB_POOL],
  useFactory: (dbPool: DbPool): UserDirectory =>
    new DrizzleUserDirectory(dbPool.db),
};

const createOrganizationProvider = {
  provide: CreateOrganization,
  inject: [ORGANIZATION_REPOSITORY, ORGANIZATION_MEMBER_REPOSITORY],
  useFactory: (
    orgRepo: OrganizationRepository,
    memberRepo: OrganizationMemberRepository,
  ) => new CreateOrganization(orgRepo, memberRepo),
};

const listMyOrganizationsProvider = {
  provide: ListMyOrganizations,
  inject: [ORGANIZATION_MEMBER_REPOSITORY],
  useFactory: (memberRepo: OrganizationMemberRepository) => new ListMyOrganizations(memberRepo),
};

const listOrganizationsProvider = {
  provide: ListOrganizations,
  inject: [ORGANIZATION_REPOSITORY],
  useFactory: (orgRepo: OrganizationRepository) => new ListOrganizations(orgRepo),
};

const addOrganizationMemberProvider = {
  provide: AddOrganizationMember,
  inject: [ORGANIZATION_MEMBER_REPOSITORY, USER_DIRECTORY],
  useFactory: (memberRepo: OrganizationMemberRepository, userDirectory: UserDirectory) =>
    new AddOrganizationMember(memberRepo, userDirectory),
};

const removeOrganizationMemberProvider = {
  provide: RemoveOrganizationMember,
  inject: [ORGANIZATION_MEMBER_REPOSITORY],
  useFactory: (memberRepo: OrganizationMemberRepository) =>
    new RemoveOrganizationMember(memberRepo),
};

const listOrganizationMembersProvider = {
  provide: ListOrganizationMembers,
  inject: [ORGANIZATION_MEMBER_REPOSITORY, USER_DIRECTORY],
  useFactory: (memberRepo: OrganizationMemberRepository, userDirectory: UserDirectory) =>
    new ListOrganizationMembers(memberRepo, userDirectory),
};

@Module({
  imports: [IdentityModule],
  controllers: [OrganizationsController],
  providers: [
    dbPoolProvider,
    organizationRepositoryProvider,
    organizationMemberRepositoryProvider,
    userDirectoryProvider,
    createOrganizationProvider,
    listMyOrganizationsProvider,
    listOrganizationsProvider,
    addOrganizationMemberProvider,
    removeOrganizationMemberProvider,
    listOrganizationMembersProvider,
  ],
})
export class OrganizationsModule implements OnModuleDestroy {
  constructor(@Inject(ORGANIZATIONS_DB_POOL) private readonly dbPool: DbPool) {}

  async onModuleDestroy(): Promise<void> {
    try {
      await this.dbPool.pool.end();
    } catch (_) {
      // ignore — let remaining teardown proceed
    }
  }
}
