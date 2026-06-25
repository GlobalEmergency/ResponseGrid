import { Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Pool } from 'pg';
import { Db, createDb } from '../../../shared/db';
import { AuthController } from './http/auth.controller';
import { Login } from '../application/login';
import { USER_REPOSITORY, UserRepository } from '../domain/ports/user.repository';
import { MEMBERSHIP_REPOSITORY, MembershipRepository } from '../domain/ports/membership.repository';
import { PASSWORD_HASHER } from '../domain/ports/password-hasher';
import { TOKEN_SERVICE } from '../domain/ports/token.service';
import { DrizzleUserRepository } from './drizzle/drizzle-user.repository';
import { DrizzleMembershipRepository } from './drizzle/drizzle-membership.repository';
import { BcryptPasswordHasher } from './bcrypt-password-hasher';
import { JwtTokenService } from './jwt-token.service';
import { JwtAuthGuard } from './http/jwt-auth.guard';
import { RequireAdminGuard } from './http/require-admin.guard';
import { RequireCoordinatorGuard } from './http/require-coordinator.guard';
import { RequireAnyCoordinatorGuard } from './http/require-any-coordinator.guard';

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

const passwordHasherProvider = {
  provide: PASSWORD_HASHER,
  useFactory: () => new BcryptPasswordHasher(),
};

const tokenServiceProvider = {
  provide: TOKEN_SERVICE,
  inject: [JwtService],
  useFactory: (jwtService: JwtService) => new JwtTokenService(jwtService),
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

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error('JWT_SECRET is required');
        return { secret, signOptions: { expiresIn: '12h' } };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    dbPoolProvider,
    userRepositoryProvider,
    membershipRepositoryProvider,
    passwordHasherProvider,
    tokenServiceProvider,
    loginProvider,
    JwtAuthGuard,
    RequireAdminGuard,
    RequireCoordinatorGuard,
    RequireAnyCoordinatorGuard,
  ],
  exports: [
    USER_REPOSITORY,
    MEMBERSHIP_REPOSITORY,
    TOKEN_SERVICE,
    JwtAuthGuard,
    RequireAdminGuard,
    RequireCoordinatorGuard,
    RequireAnyCoordinatorGuard,
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
