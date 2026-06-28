import { Module } from '@nestjs/common';
import { DB, DatabaseModule } from '../../../shared/database.module';
import { Db } from '../../../shared/db';
import { IdentityModule } from '../../identity/infrastructure/identity.module';
import { AccreditationModule } from '../../accreditation/infrastructure/accreditation.module';
import {
  ACCREDITATION_REPOSITORY,
  AccreditationRepository,
} from '../../accreditation/domain/ports/accreditation.repository';
import {
  SERVICE_ACCOUNT_REPOSITORY,
  ServiceAccountRepository,
} from '../../identity/domain/ports/service-account.repository';
import {
  API_KEY_REPOSITORY,
  ApiKeyRepository,
} from '../../identity/domain/ports/api-key.repository';
import {
  ORGANIZATION_REPOSITORY,
  OrganizationRepository,
} from '../domain/ports/organization.repository';
import {
  ORGANIZATION_MEMBER_REPOSITORY,
  OrganizationMemberRepository,
} from '../domain/ports/organization-member.repository';
import { USER_DIRECTORY, UserDirectory } from '../domain/ports/user-directory';
import {
  ACCREDITATION_READER,
  AccreditationReader,
} from '../domain/ports/accreditation-reader';
import {
  SERVICE_ACCOUNT_READER,
  ServiceAccountReader,
} from '../domain/ports/service-account-reader';
import { DrizzleOrganizationRepository } from './drizzle/drizzle-organization.repository';
import { DrizzleOrganizationMemberRepository } from './drizzle/drizzle-organization-member.repository';
import { DrizzleUserDirectory } from './drizzle/drizzle-user-directory';
import { AccreditationReaderAdapter } from './accreditation-reader.adapter';
import { ServiceAccountReaderAdapter } from './service-account-reader.adapter';
import { CreateOrganization } from '../application/create-organization';
import { ListMyOrganizations } from '../application/list-my-organizations';
import { ListOrganizations } from '../application/list-organizations';
import { ListOrganizationsAdmin } from '../application/list-organizations-admin';
import { GetOrganizationAdminDetail } from '../application/get-organization-admin-detail';
import { AddOrganizationMember } from '../application/add-organization-member';
import { RemoveOrganizationMember } from '../application/remove-organization-member';
import { ListOrganizationMembers } from '../application/list-organization-members';
import { OrganizationsController } from './http/organizations.controller';

const organizationRepositoryProvider = {
  provide: ORGANIZATION_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): OrganizationRepository =>
    new DrizzleOrganizationRepository(db),
};

const organizationMemberRepositoryProvider = {
  provide: ORGANIZATION_MEMBER_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): OrganizationMemberRepository =>
    new DrizzleOrganizationMemberRepository(db),
};

const userDirectoryProvider = {
  provide: USER_DIRECTORY,
  inject: [DB],
  useFactory: (db: Db): UserDirectory => new DrizzleUserDirectory(db),
};

const accreditationReaderProvider = {
  provide: ACCREDITATION_READER,
  inject: [ACCREDITATION_REPOSITORY],
  useFactory: (repo: AccreditationRepository): AccreditationReader =>
    new AccreditationReaderAdapter(repo),
};

const serviceAccountReaderProvider = {
  provide: SERVICE_ACCOUNT_READER,
  inject: [SERVICE_ACCOUNT_REPOSITORY, API_KEY_REPOSITORY],
  useFactory: (
    serviceAccounts: ServiceAccountRepository,
    apiKeys: ApiKeyRepository,
  ): ServiceAccountReader =>
    new ServiceAccountReaderAdapter(serviceAccounts, apiKeys),
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
  useFactory: (memberRepo: OrganizationMemberRepository) =>
    new ListMyOrganizations(memberRepo),
};

const listOrganizationsProvider = {
  provide: ListOrganizations,
  inject: [ORGANIZATION_REPOSITORY],
  useFactory: (orgRepo: OrganizationRepository) =>
    new ListOrganizations(orgRepo),
};

const listOrganizationsAdminProvider = {
  provide: ListOrganizationsAdmin,
  inject: [
    ORGANIZATION_REPOSITORY,
    ORGANIZATION_MEMBER_REPOSITORY,
    ACCREDITATION_READER,
  ],
  useFactory: (
    orgRepo: OrganizationRepository,
    memberRepo: OrganizationMemberRepository,
    accreditations: AccreditationReader,
  ) => new ListOrganizationsAdmin(orgRepo, memberRepo, accreditations),
};

const getOrganizationAdminDetailProvider = {
  provide: GetOrganizationAdminDetail,
  inject: [
    ORGANIZATION_REPOSITORY,
    ORGANIZATION_MEMBER_REPOSITORY,
    USER_DIRECTORY,
    ACCREDITATION_READER,
    SERVICE_ACCOUNT_READER,
  ],
  useFactory: (
    orgRepo: OrganizationRepository,
    memberRepo: OrganizationMemberRepository,
    userDirectory: UserDirectory,
    accreditations: AccreditationReader,
    serviceAccounts: ServiceAccountReader,
  ) =>
    new GetOrganizationAdminDetail(
      orgRepo,
      memberRepo,
      userDirectory,
      accreditations,
      serviceAccounts,
    ),
};

const addOrganizationMemberProvider = {
  provide: AddOrganizationMember,
  inject: [ORGANIZATION_MEMBER_REPOSITORY, USER_DIRECTORY],
  useFactory: (
    memberRepo: OrganizationMemberRepository,
    userDirectory: UserDirectory,
  ) => new AddOrganizationMember(memberRepo, userDirectory),
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
  useFactory: (
    memberRepo: OrganizationMemberRepository,
    userDirectory: UserDirectory,
  ) => new ListOrganizationMembers(memberRepo, userDirectory),
};

@Module({
  imports: [DatabaseModule, IdentityModule, AccreditationModule],
  controllers: [OrganizationsController],
  providers: [
    organizationRepositoryProvider,
    organizationMemberRepositoryProvider,
    userDirectoryProvider,
    accreditationReaderProvider,
    serviceAccountReaderProvider,
    createOrganizationProvider,
    listMyOrganizationsProvider,
    listOrganizationsProvider,
    listOrganizationsAdminProvider,
    getOrganizationAdminDetailProvider,
    addOrganizationMemberProvider,
    removeOrganizationMemberProvider,
    listOrganizationMembersProvider,
  ],
})
export class OrganizationsModule {}
