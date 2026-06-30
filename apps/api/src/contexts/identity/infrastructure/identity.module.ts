import { Module } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { DB, DatabaseModule } from '../../../shared/database.module';
import { Db } from '../../../shared/db';
import { AuthController } from './http/auth.controller';
import { OAuthController } from './http/oauth.controller';
import { GrantsController } from './http/grants.controller';
import { ApiKeysController } from './http/api-keys.controller';
import { ServiceAccountIntrospectionController } from './http/service-account-introspection.controller';
import { RolesController } from './http/roles.controller';
import { UsersController } from './http/users.controller';
import { Login } from '../application/login';
import { RegisterUser } from '../application/register-user';
import { AuthenticateWithProvider } from '../application/authenticate-with-provider';
import { GrantRole } from '../application/grant-role';
import { RevokeGrant } from '../application/revoke-grant';
import { CreateServiceAccount } from '../application/create-service-account';
import { IssueApiKey } from '../application/issue-api-key';
import { RevokeApiKey } from '../application/revoke-api-key';
import { FindUserByEmail } from '../application/find-user-by-email';
import { ListGrantsAtScope } from '../application/list-grants-at-scope';
import { ListApiKeys } from '../application/list-api-keys';
import { ListServiceAccountsByOrg } from '../application/list-service-accounts-by-org';
import { ListUsersAdmin } from '../application/list-users-admin';
import { GetUserAdminDetail } from '../application/get-user-admin-detail';
import { EnsureDonorAccount } from '../application/ensure-donor-account';
import { UpdateProfile } from '../application/update-profile';
import {
  SET_PASSWORD_INVITER,
  SetPasswordInviter,
} from '../domain/ports/set-password-inviter';
import { NoopSetPasswordInviter } from './noop-set-password-inviter';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../domain/ports/user.repository';
import {
  MEMBERSHIP_REPOSITORY,
  MembershipRepository,
} from '../domain/ports/membership.repository';
import {
  GRANT_REPOSITORY,
  GrantRepository,
} from '../domain/ports/grant.repository';
import {
  SERVICE_ACCOUNT_REPOSITORY,
  ServiceAccountRepository,
} from '../domain/ports/service-account.repository';
import {
  API_KEY_REPOSITORY,
  ApiKeyRepository,
} from '../domain/ports/api-key.repository';
import {
  USER_IDENTITY_REPOSITORY,
  UserIdentityRepository,
} from '../domain/ports/user-identity.repository';
import {
  USER_ADMIN_REPOSITORY,
  UserAdminRepository,
} from '../domain/ports/user-admin.repository';
import {
  ORGANIZATION_READER,
  OrganizationReader,
} from '../domain/ports/organization-reader';
import {
  USER_ACTIVITY_READER,
  UserActivityReader,
} from '../domain/ports/user-activity-reader';
import {
  SCOPE_NAME_READER,
  ScopeNameReader,
} from '../domain/ports/scope-name-reader';
import { PASSWORD_HASHER } from '../domain/ports/password-hasher';
import { TOKEN_SERVICE } from '../domain/ports/token.service';
import { DrizzleUserRepository } from './drizzle/drizzle-user.repository';
import { DrizzleUserAdminRepository } from './drizzle/drizzle-user-admin.repository';
import { DrizzleOrganizationReader } from './drizzle/drizzle-organization-reader';
import { DrizzleUserActivityReader } from './drizzle/drizzle-user-activity-reader';
import { DrizzleScopeNameReader } from './drizzle/drizzle-scope-name-reader';
import { DrizzleMembershipRepository } from './drizzle/drizzle-membership.repository';
import { DrizzleGrantRepository } from './drizzle/drizzle-grant.repository';
import { DrizzleServiceAccountRepository } from './drizzle/drizzle-service-account.repository';
import { DrizzleApiKeyRepository } from './drizzle/drizzle-api-key.repository';
import { ACCESS_CONTROL } from '../domain/authorization/access-control';
import type { AccessControl } from '../domain/authorization/access-control';
import { LocalAccessControl } from '../domain/authorization/local-access-control';
import { PermissionGuard } from './http/permission.guard';
import { ServiceAccountPermissionGuard } from './http/service-account-permission.guard';
import { ApiKeyAuthGuard } from './http/api-key-auth.guard';
import { JwtOrApiKeyAuthGuard } from './http/jwt-or-api-key-auth.guard';
import { SCOPE_RESOLVER } from './http/scope-resolver';
import { EntityAwareScopeResolver } from './http/entity-aware-scope-resolver';
import { DrizzleUserIdentityRepository } from './drizzle/drizzle-user-identity.repository';
import { BcryptPasswordHasher } from './bcrypt-password-hasher';
import { JwtTokenService } from './jwt-token.service';
import { JwtAuthGuard } from './http/jwt-auth.guard';
import { OptionalJwtAuthGuard } from './http/optional-jwt-auth.guard';
import { RequireAdminGuard } from './http/require-admin.guard';
import { DrizzleResourceEmergencyLookup } from './drizzle/drizzle-resource-emergency-lookup';
import { DrizzleNeedEmergencyLookup } from './drizzle/drizzle-need-emergency-lookup';
import { DrizzleOfferEmergencyLookup } from './drizzle/drizzle-offer-emergency-lookup';
import {
  RESOURCE_EMERGENCY_LOOKUP,
  ResourceEmergencyLookup,
} from '../domain/ports/resource-emergency-lookup';
import {
  NEED_EMERGENCY_LOOKUP,
  NeedEmergencyLookup,
} from '../domain/ports/need-emergency-lookup';
import {
  OFFER_EMERGENCY_LOOKUP,
  OfferEmergencyLookup,
} from '../domain/ports/offer-emergency-lookup';
import { DrizzleVolunteerEmergencyLookup } from './drizzle/drizzle-volunteer-emergency-lookup';
import {
  VOLUNTEER_EMERGENCY_LOOKUP,
  VolunteerEmergencyLookup,
} from '../domain/ports/volunteer-emergency-lookup';
import { DrizzleTaskEmergencyLookup } from './drizzle/drizzle-task-emergency-lookup';
import {
  TASK_EMERGENCY_LOOKUP,
  TaskEmergencyLookup,
} from '../domain/ports/task-emergency-lookup';
import { DrizzleReportEmergencyLookup } from './drizzle/drizzle-report-emergency-lookup';
import {
  REPORT_EMERGENCY_LOOKUP,
  ReportEmergencyLookup,
} from '../domain/ports/report-emergency-lookup';
import { DrizzleIntakeEmergencyLookup } from './drizzle/drizzle-intake-emergency-lookup';
import {
  INTAKE_EMERGENCY_LOOKUP,
  IntakeEmergencyLookup,
} from '../domain/ports/intake-emergency-lookup';
import { GoogleStrategy } from './http/google.strategy';
import { FacebookStrategy } from './http/facebook.strategy';

const userRepositoryProvider = {
  provide: USER_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): UserRepository => new DrizzleUserRepository(db),
};

const membershipRepositoryProvider = {
  provide: MEMBERSHIP_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): MembershipRepository =>
    new DrizzleMembershipRepository(db),
};

const grantRepositoryProvider = {
  provide: GRANT_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): GrantRepository => new DrizzleGrantRepository(db),
};

const accessControlProvider = {
  provide: ACCESS_CONTROL,
  useFactory: () => new LocalAccessControl(),
};

const scopeResolverProvider = {
  provide: SCOPE_RESOLVER,
  useClass: EntityAwareScopeResolver,
};

const grantRoleProvider = {
  provide: GrantRole,
  inject: [GRANT_REPOSITORY, ACCESS_CONTROL, RESOURCE_EMERGENCY_LOOKUP],
  useFactory: (
    grants: GrantRepository,
    access: AccessControl,
    resourceEmergencyLookup: ResourceEmergencyLookup,
  ) => new GrantRole(grants, access, resourceEmergencyLookup),
};

const revokeGrantProvider = {
  provide: RevokeGrant,
  inject: [GRANT_REPOSITORY, ACCESS_CONTROL, RESOURCE_EMERGENCY_LOOKUP],
  useFactory: (
    grants: GrantRepository,
    access: AccessControl,
    resourceEmergencyLookup: ResourceEmergencyLookup,
  ) => new RevokeGrant(grants, access, resourceEmergencyLookup),
};

const findUserByEmailProvider = {
  provide: FindUserByEmail,
  inject: [USER_REPOSITORY],
  useFactory: (users: UserRepository) => new FindUserByEmail(users),
};

const userAdminRepositoryProvider = {
  provide: USER_ADMIN_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): UserAdminRepository =>
    new DrizzleUserAdminRepository(db),
};

const organizationReaderProvider = {
  provide: ORGANIZATION_READER,
  inject: [DB],
  useFactory: (db: Db): OrganizationReader => new DrizzleOrganizationReader(db),
};

const userActivityReaderProvider = {
  provide: USER_ACTIVITY_READER,
  inject: [DB],
  useFactory: (db: Db): UserActivityReader => new DrizzleUserActivityReader(db),
};

const scopeNameReaderProvider = {
  provide: SCOPE_NAME_READER,
  inject: [DB],
  useFactory: (db: Db): ScopeNameReader => new DrizzleScopeNameReader(db),
};

const listUsersAdminProvider = {
  provide: ListUsersAdmin,
  inject: [USER_ADMIN_REPOSITORY, GRANT_REPOSITORY],
  useFactory: (users: UserAdminRepository, grants: GrantRepository) =>
    new ListUsersAdmin(users, grants),
};

const getUserAdminDetailProvider = {
  provide: GetUserAdminDetail,
  inject: [
    USER_ADMIN_REPOSITORY,
    GRANT_REPOSITORY,
    ORGANIZATION_READER,
    USER_ACTIVITY_READER,
    SCOPE_NAME_READER,
  ],
  useFactory: (
    users: UserAdminRepository,
    grants: GrantRepository,
    organizations: OrganizationReader,
    activity: UserActivityReader,
    scopeNames: ScopeNameReader,
  ) =>
    new GetUserAdminDetail(users, grants, organizations, activity, scopeNames),
};

const listGrantsAtScopeProvider = {
  provide: ListGrantsAtScope,
  inject: [
    GRANT_REPOSITORY,
    ACCESS_CONTROL,
    USER_REPOSITORY,
    SERVICE_ACCOUNT_REPOSITORY,
    RESOURCE_EMERGENCY_LOOKUP,
  ],
  useFactory: (
    grants: GrantRepository,
    access: AccessControl,
    users: UserRepository,
    sas: ServiceAccountRepository,
    resourceEmergencyLookup: ResourceEmergencyLookup,
  ) =>
    new ListGrantsAtScope(grants, access, users, sas, resourceEmergencyLookup),
};

const serviceAccountRepositoryProvider = {
  provide: SERVICE_ACCOUNT_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): ServiceAccountRepository =>
    new DrizzleServiceAccountRepository(db),
};

const apiKeyRepositoryProvider = {
  provide: API_KEY_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): ApiKeyRepository => new DrizzleApiKeyRepository(db),
};

const createServiceAccountProvider = {
  provide: CreateServiceAccount,
  inject: [SERVICE_ACCOUNT_REPOSITORY, ACCESS_CONTROL],
  useFactory: (sas: ServiceAccountRepository, access: AccessControl) =>
    new CreateServiceAccount(sas, access),
};

const issueApiKeyProvider = {
  provide: IssueApiKey,
  inject: [SERVICE_ACCOUNT_REPOSITORY, API_KEY_REPOSITORY, ACCESS_CONTROL],
  useFactory: (
    sas: ServiceAccountRepository,
    keys: ApiKeyRepository,
    access: AccessControl,
  ) => new IssueApiKey(sas, keys, access),
};

const revokeApiKeyProvider = {
  provide: RevokeApiKey,
  inject: [SERVICE_ACCOUNT_REPOSITORY, API_KEY_REPOSITORY, ACCESS_CONTROL],
  useFactory: (
    sas: ServiceAccountRepository,
    keys: ApiKeyRepository,
    access: AccessControl,
  ) => new RevokeApiKey(sas, keys, access),
};

const listApiKeysProvider = {
  provide: ListApiKeys,
  inject: [SERVICE_ACCOUNT_REPOSITORY, API_KEY_REPOSITORY, ACCESS_CONTROL],
  useFactory: (
    sas: ServiceAccountRepository,
    keys: ApiKeyRepository,
    access: AccessControl,
  ) => new ListApiKeys(sas, keys, access),
};

const listServiceAccountsByOrgProvider = {
  provide: ListServiceAccountsByOrg,
  inject: [SERVICE_ACCOUNT_REPOSITORY, ACCESS_CONTROL],
  useFactory: (sas: ServiceAccountRepository, access: AccessControl) =>
    new ListServiceAccountsByOrg(sas, access),
};

const userIdentityRepositoryProvider = {
  provide: USER_IDENTITY_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): UserIdentityRepository =>
    new DrizzleUserIdentityRepository(db),
};

const passwordHasherProvider = {
  provide: PASSWORD_HASHER,
  useFactory: () => new BcryptPasswordHasher(),
};

const tokenServiceProvider = {
  provide: TOKEN_SERVICE,
  inject: [JwtService],
  useFactory: (jwtService: JwtService) => new JwtTokenService(jwtService),
};

const resourceEmergencyLookupProvider = {
  provide: RESOURCE_EMERGENCY_LOOKUP,
  inject: [DB],
  useFactory: (db: Db): ResourceEmergencyLookup =>
    new DrizzleResourceEmergencyLookup(db),
};

const needEmergencyLookupProvider = {
  provide: NEED_EMERGENCY_LOOKUP,
  inject: [DB],
  useFactory: (db: Db): NeedEmergencyLookup =>
    new DrizzleNeedEmergencyLookup(db),
};

const offerEmergencyLookupProvider = {
  provide: OFFER_EMERGENCY_LOOKUP,
  inject: [DB],
  useFactory: (db: Db): OfferEmergencyLookup =>
    new DrizzleOfferEmergencyLookup(db),
};

const volunteerEmergencyLookupProvider = {
  provide: VOLUNTEER_EMERGENCY_LOOKUP,
  inject: [DB],
  useFactory: (db: Db): VolunteerEmergencyLookup =>
    new DrizzleVolunteerEmergencyLookup(db),
};

const taskEmergencyLookupProvider = {
  provide: TASK_EMERGENCY_LOOKUP,
  inject: [DB],
  useFactory: (db: Db): TaskEmergencyLookup =>
    new DrizzleTaskEmergencyLookup(db),
};

const reportEmergencyLookupProvider = {
  provide: REPORT_EMERGENCY_LOOKUP,
  inject: [DB],
  useFactory: (db: Db): ReportEmergencyLookup =>
    new DrizzleReportEmergencyLookup(db),
};

const intakeEmergencyLookupProvider = {
  provide: INTAKE_EMERGENCY_LOOKUP,
  inject: [DB],
  useFactory: (db: Db): IntakeEmergencyLookup =>
    new DrizzleIntakeEmergencyLookup(db),
};

const loginProvider = {
  provide: Login,
  inject: [USER_REPOSITORY, PASSWORD_HASHER, TOKEN_SERVICE],
  useFactory: (
    userRepo: UserRepository,
    hasher: BcryptPasswordHasher,
    tokenService: JwtTokenService,
  ) => new Login(userRepo, hasher, tokenService),
};

const registerUserProvider = {
  provide: RegisterUser,
  inject: [USER_REPOSITORY, PASSWORD_HASHER, TOKEN_SERVICE],
  useFactory: (
    userRepo: UserRepository,
    hasher: BcryptPasswordHasher,
    tokenService: JwtTokenService,
  ) => new RegisterUser(userRepo, hasher, tokenService),
};

const authenticateWithProviderProvider = {
  provide: AuthenticateWithProvider,
  inject: [USER_REPOSITORY, USER_IDENTITY_REPOSITORY, TOKEN_SERVICE],
  useFactory: (
    userRepo: UserRepository,
    identityRepo: UserIdentityRepository,
    tokenService: JwtTokenService,
  ) => new AuthenticateWithProvider(userRepo, identityRepo, tokenService),
};

const setPasswordInviterProvider = {
  provide: SET_PASSWORD_INVITER,
  useClass: NoopSetPasswordInviter,
};

const ensureDonorAccountProvider = {
  provide: EnsureDonorAccount,
  inject: [USER_REPOSITORY, SET_PASSWORD_INVITER],
  useFactory: (users: UserRepository, inviter: SetPasswordInviter) =>
    new EnsureDonorAccount(users, inviter),
};

const updateProfileProvider = {
  provide: UpdateProfile,
  inject: [USER_REPOSITORY],
  useFactory: (userRepo: UserRepository) => new UpdateProfile(userRepo),
};

@Module({
  imports: [
    DatabaseModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET is required');
        return { secret, signOptions: { expiresIn: '12h' } };
      },
    }),
  ],
  controllers: [
    AuthController,
    OAuthController,
    GrantsController,
    ApiKeysController,
    ServiceAccountIntrospectionController,
    RolesController,
    UsersController,
  ],
  providers: [
    userRepositoryProvider,
    membershipRepositoryProvider,
    grantRepositoryProvider,
    userIdentityRepositoryProvider,
    passwordHasherProvider,
    tokenServiceProvider,
    loginProvider,
    registerUserProvider,
    authenticateWithProviderProvider,
    setPasswordInviterProvider,
    ensureDonorAccountProvider,
    updateProfileProvider,
    grantRoleProvider,
    revokeGrantProvider,
    findUserByEmailProvider,
    userAdminRepositoryProvider,
    organizationReaderProvider,
    userActivityReaderProvider,
    scopeNameReaderProvider,
    listUsersAdminProvider,
    getUserAdminDetailProvider,
    listGrantsAtScopeProvider,
    serviceAccountRepositoryProvider,
    apiKeyRepositoryProvider,
    createServiceAccountProvider,
    issueApiKeyProvider,
    revokeApiKeyProvider,
    listApiKeysProvider,
    listServiceAccountsByOrgProvider,
    resourceEmergencyLookupProvider,
    needEmergencyLookupProvider,
    offerEmergencyLookupProvider,
    volunteerEmergencyLookupProvider,
    taskEmergencyLookupProvider,
    reportEmergencyLookupProvider,
    intakeEmergencyLookupProvider,
    accessControlProvider,
    scopeResolverProvider,
    PermissionGuard,
    ServiceAccountPermissionGuard,
    ApiKeyAuthGuard,
    JwtAuthGuard,
    JwtOrApiKeyAuthGuard,
    OptionalJwtAuthGuard,
    RequireAdminGuard,
    GoogleStrategy,
    FacebookStrategy,
  ],
  exports: [
    USER_REPOSITORY,
    MEMBERSHIP_REPOSITORY,
    GRANT_REPOSITORY,
    SERVICE_ACCOUNT_REPOSITORY,
    API_KEY_REPOSITORY,
    TOKEN_SERVICE,
    EnsureDonorAccount,
    RESOURCE_EMERGENCY_LOOKUP,
    NEED_EMERGENCY_LOOKUP,
    OFFER_EMERGENCY_LOOKUP,
    VOLUNTEER_EMERGENCY_LOOKUP,
    TASK_EMERGENCY_LOOKUP,
    REPORT_EMERGENCY_LOOKUP,
    INTAKE_EMERGENCY_LOOKUP,
    ACCESS_CONTROL,
    SCOPE_RESOLVER,
    PermissionGuard,
    ServiceAccountPermissionGuard,
    ApiKeyAuthGuard,
    JwtAuthGuard,
    JwtOrApiKeyAuthGuard,
    OptionalJwtAuthGuard,
    RequireAdminGuard,
    JwtModule,
  ],
})
export class IdentityModule {}
