import { Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Pool } from 'pg';
import { Db, createDb } from '../../../shared/db';
import { AuthController } from './http/auth.controller';
import { OAuthController } from './http/oauth.controller';
import { Login } from '../application/login';
import { RegisterUser } from '../application/register-user';
import { AuthenticateWithProvider } from '../application/authenticate-with-provider';
import { USER_REPOSITORY, UserRepository } from '../domain/ports/user.repository';
import { MEMBERSHIP_REPOSITORY, MembershipRepository } from '../domain/ports/membership.repository';
import {
  USER_IDENTITY_REPOSITORY,
  UserIdentityRepository,
} from '../domain/ports/user-identity.repository';
import { PASSWORD_HASHER } from '../domain/ports/password-hasher';
import { TOKEN_SERVICE } from '../domain/ports/token.service';
import { DrizzleUserRepository } from './drizzle/drizzle-user.repository';
import { DrizzleMembershipRepository } from './drizzle/drizzle-membership.repository';
import { DrizzleUserIdentityRepository } from './drizzle/drizzle-user-identity.repository';
import { BcryptPasswordHasher } from './bcrypt-password-hasher';
import { JwtTokenService } from './jwt-token.service';
import { JwtAuthGuard } from './http/jwt-auth.guard';
import { RequireAdminGuard } from './http/require-admin.guard';
import { RequireCoordinatorGuard } from './http/require-coordinator.guard';
import { RequireResourceCoordinatorGuard } from './http/require-resource-coordinator.guard';
import { RequireNeedCoordinatorGuard } from './http/require-need-coordinator.guard';
import { DrizzleResourceEmergencyLookup } from './drizzle/drizzle-resource-emergency-lookup';
import { DrizzleNeedEmergencyLookup } from './drizzle/drizzle-need-emergency-lookup';
import {
  RESOURCE_EMERGENCY_LOOKUP,
  ResourceEmergencyLookup,
} from '../domain/ports/resource-emergency-lookup';
import {
  NEED_EMERGENCY_LOOKUP,
  NeedEmergencyLookup,
} from '../domain/ports/need-emergency-lookup';
import { GoogleStrategy } from './http/google.strategy';
import { FacebookStrategy } from './http/facebook.strategy';

export const IDENTITY_DB_POOL = Symbol('IDENTITY_DB_POOL');

interface DbPool {
  db: Db;
  pool: Pool;
}

const dbPoolProvider = {
  provide: IDENTITY_DB_POOL,
  useFactory: (): DbPool => {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is required');
    return createDb(url);
  },
};

const userRepositoryProvider = {
  provide: USER_REPOSITORY,
  inject: [IDENTITY_DB_POOL],
  useFactory: (dbPool: DbPool): UserRepository => new DrizzleUserRepository(dbPool.db),
};

const membershipRepositoryProvider = {
  provide: MEMBERSHIP_REPOSITORY,
  inject: [IDENTITY_DB_POOL],
  useFactory: (dbPool: DbPool): MembershipRepository => new DrizzleMembershipRepository(dbPool.db),
};

const userIdentityRepositoryProvider = {
  provide: USER_IDENTITY_REPOSITORY,
  inject: [IDENTITY_DB_POOL],
  useFactory: (dbPool: DbPool): UserIdentityRepository =>
    new DrizzleUserIdentityRepository(dbPool.db),
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
  inject: [IDENTITY_DB_POOL],
  useFactory: (dbPool: DbPool): ResourceEmergencyLookup =>
    new DrizzleResourceEmergencyLookup(dbPool.db),
};

const needEmergencyLookupProvider = {
  provide: NEED_EMERGENCY_LOOKUP,
  inject: [IDENTITY_DB_POOL],
  useFactory: (dbPool: DbPool): NeedEmergencyLookup =>
    new DrizzleNeedEmergencyLookup(dbPool.db),
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
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET is required');
        return { secret, signOptions: { expiresIn: '12h' } };
      },
    }),
  ],
  controllers: [AuthController, OAuthController],
  providers: [
    dbPoolProvider,
    userRepositoryProvider,
    membershipRepositoryProvider,
    userIdentityRepositoryProvider,
    passwordHasherProvider,
    tokenServiceProvider,
    loginProvider,
    registerUserProvider,
    authenticateWithProviderProvider,
    resourceEmergencyLookupProvider,
    needEmergencyLookupProvider,
    JwtAuthGuard,
    RequireAdminGuard,
    RequireCoordinatorGuard,
    RequireResourceCoordinatorGuard,
    RequireNeedCoordinatorGuard,
    GoogleStrategy,
    FacebookStrategy,
  ],
  exports: [
    USER_REPOSITORY,
    MEMBERSHIP_REPOSITORY,
    TOKEN_SERVICE,
    RESOURCE_EMERGENCY_LOOKUP,
    NEED_EMERGENCY_LOOKUP,
    JwtAuthGuard,
    RequireAdminGuard,
    RequireCoordinatorGuard,
    RequireResourceCoordinatorGuard,
    RequireNeedCoordinatorGuard,
    JwtModule,
  ],
})
export class IdentityModule implements OnModuleDestroy {
  constructor(@Inject(IDENTITY_DB_POOL) private readonly dbPool: DbPool) {}

  async onModuleDestroy(): Promise<void> {
    try {
      await this.dbPool.pool.end();
    } catch (_) {
      // ignore — let remaining teardown proceed
    }
  }
}
