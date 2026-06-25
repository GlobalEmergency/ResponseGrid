import { Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { Db } from '../../../shared/db';
import { EmergenciesController } from './http/emergencies.controller';
import { CreateEmergency } from '../application/create-emergency';
import { ListActiveEmergencies } from '../application/list-active-emergencies';
import { GetEmergencyBySlug } from '../application/get-emergency-by-slug';
import { EMERGENCY_REPOSITORY, EmergencyRepository } from '../domain/ports/emergency.repository';
import { DrizzleEmergencyRepository } from './drizzle/drizzle-emergency.repository';
import { createDb } from '../../../shared/db';

export const DB_POOL = Symbol('EMERGENCIES_DB_POOL');

interface DbPool {
  db: Db;
  pool: Pool;
}

const dbPoolProvider = {
  provide: DB_POOL,
  useFactory: (): DbPool => {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is required');
    return createDb(url);
  },
};

const emergencyRepositoryProvider = {
  provide: EMERGENCY_REPOSITORY,
  inject: [DB_POOL],
  useFactory: (dbPool: DbPool): EmergencyRepository => new DrizzleEmergencyRepository(dbPool.db),
};

const createEmergencyProvider = {
  provide: CreateEmergency,
  inject: [EMERGENCY_REPOSITORY],
  useFactory: (repo: EmergencyRepository) => new CreateEmergency(repo),
};

const listActiveProvider = {
  provide: ListActiveEmergencies,
  inject: [EMERGENCY_REPOSITORY],
  useFactory: (repo: EmergencyRepository) => new ListActiveEmergencies(repo),
};

const getBySlugProvider = {
  provide: GetEmergencyBySlug,
  inject: [EMERGENCY_REPOSITORY],
  useFactory: (repo: EmergencyRepository) => new GetEmergencyBySlug(repo),
};

@Module({
  controllers: [EmergenciesController],
  providers: [
    dbPoolProvider,
    emergencyRepositoryProvider,
    createEmergencyProvider,
    listActiveProvider,
    getBySlugProvider,
  ],
})
export class EmergenciesModule implements OnModuleDestroy {
  constructor(@Inject(DB_POOL) private readonly dbPool: DbPool) {}

  async onModuleDestroy(): Promise<void> {
    try {
      await this.dbPool.pool.end();
    } catch (_) {
      // ignore — let remaining teardown proceed
    }
  }
}
