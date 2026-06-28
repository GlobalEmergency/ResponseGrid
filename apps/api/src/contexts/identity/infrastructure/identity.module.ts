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
import { Login } from '../application/login';
import { RegisterUser } from '../application/register-user';
import { AuthenticateWithProvider } from '../application/authenticate-with-provider';
import { GrantRole } from '../application/grant-role';
import { RevokeGrant } from '../application/revoke-grant';
import { CreateServiceAccount } from '../application/create-service-account';
import { IssueApiKey } from '../application/issue-api-key';
import { RevokeApiKey } from '../application/revoke-api-key';
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
import { PASSWORD_HASHER } from '../domain/ports/password-hasher';
import { TOKEN_SERVICE } from '../domain/ports/token.service';
import { DrizzleUserRepository } from './drizzle/drizzle-user.repository';
import { DrizzleMembershipRepository } from './drizzle/drizzle-membership.repository';
import { DrizzleGrantRepository } from './drizzle/drizzle-grant.repository';
import { DrizzleServiceAccountRepository } from './drizzle/drizzle-service-account.repository';
import { DrizzleApiKeyRepository } from './drizzle/drizzle-api-key.repository';
import { ACCESS_CONTROL } from '../domain/authorization/access-control';
import type { AccessControl } from '../domain/authorization/access-control';
import { LocalAccessControl } from '../domain/authorization/local-access-control';
import { PermissionGuard } from './http/permission.guard';
import { ApiKeyAuthGuard } from './http/api-key-auth.guard';
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
  inject: [GRANT_REPOSITORY, ACCESS_CONTROL],
  useFactory: (grants: GrantRepository, access: AccessControl) =>
    new GrantRole(grants, access),
};

const revokeGrantProvider = {
  provide: RevokeGrant,
  inject: [GRANT_REPOSITORY, ACCESS_CONTROL],
  useFactory: (grants: GrantRepository, access: AccessControl) =>
    new RevokeGrant(grants, access),
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
    grantRoleProvider,
    revokeGrantProvider,
    serviceAccountRepositoryProvider,
    apiKeyRepositoryProvider,
    createServiceAccountProvider,
    issueApiKeyProvider,
    revokeApiKeyProvider,
    resourceEmergencyLookupProvider,
    needEmergencyLookupProvider,
    offerEmergencyLookupProvider,
    volunteerEmergencyLookupProvider,
    taskEmergencyLookupProvider,
    reportEmergencyLookupProvider,
    accessControlProvider,
    scopeResolverProvider,
    PermissionGuard,
    ApiKeyAuthGuard,
    JwtAuthGuard,
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
    RESOURCE_EMERGENCY_LOOKUP,
    NEED_EMERGENCY_LOOKUP,
    OFFER_EMERGENCY_LOOKUP,
    VOLUNTEER_EMERGENCY_LOOKUP,
    TASK_EMERGENCY_LOOKUP,
    REPORT_EMERGENCY_LOOKUP,
    ACCESS_CONTROL,
    SCOPE_RESOLVER,
    PermissionGuard,
    ApiKeyAuthGuard,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
    RequireAdminGuard,
    JwtModule,
  ],
})
export class IdentityModule {}
