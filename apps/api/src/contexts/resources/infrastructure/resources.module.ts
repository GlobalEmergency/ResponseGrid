import { Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { Pool } from 'pg';
import { Db } from '../../../shared/db';
import { ResourcesController } from './http/resources.controller';
import { CoordinationController } from './http/coordination.controller';
import { PublicController } from './http/public.controller';
import { RegisterResource } from '../application/register-resource';
import { GetCoordinationQueue } from '../application/get-coordination-queue';
import { GetPublicResources } from '../application/get-public-resources';
import { VerifyResource } from '../application/verify-resource';
import { PublishResource } from '../application/publish-resource';
import { RESOURCE_REPOSITORY, ResourceRepository } from '../domain/ports/resource.repository';
import { EVENT_BUS, EventBus } from '../domain/ports/event-bus';
import { DrizzleResourceRepository } from './drizzle/drizzle-resource.repository';
import { BullMqEventBus } from './bullmq-event-bus';
import { createDb } from '../../../shared/db';

export const DB_POOL = Symbol('DB_POOL');
export const EVENT_QUEUE = Symbol('EVENT_QUEUE');

interface DbPool {
  db: Db;
  pool: Pool;
}

interface EventQueue {
  queue: Queue;
  connection: IORedis;
}

const dbPoolProvider = {
  provide: DB_POOL,
  useFactory: (): DbPool => {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is required');
    return createDb(url);
  },
};

const eventQueueProvider = {
  provide: EVENT_QUEUE,
  useFactory: (): EventQueue => {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error('REDIS_URL is required');
    const connection = new IORedis(url, { maxRetriesPerRequest: null });
    const queue = new Queue('domain-events', { connection });
    return { queue, connection };
  },
};

const dbProvider = {
  provide: RESOURCE_REPOSITORY,
  inject: [DB_POOL],
  useFactory: (dbPool: DbPool): ResourceRepository => new DrizzleResourceRepository(dbPool.db),
};

const busProvider = {
  provide: EVENT_BUS,
  inject: [EVENT_QUEUE],
  useFactory: (eventQueue: EventQueue): EventBus => new BullMqEventBus(eventQueue.queue),
};

const registerProvider = {
  provide: RegisterResource,
  inject: [RESOURCE_REPOSITORY, EVENT_BUS],
  useFactory: (repo: ResourceRepository, bus: EventBus) => new RegisterResource(repo, bus),
};
const queueProvider = {
  provide: GetCoordinationQueue,
  inject: [RESOURCE_REPOSITORY],
  useFactory: (repo: ResourceRepository) => new GetCoordinationQueue(repo),
};
const verifyProvider = {
  provide: VerifyResource,
  inject: [RESOURCE_REPOSITORY, EVENT_BUS],
  useFactory: (repo: ResourceRepository, bus: EventBus) => new VerifyResource(repo, bus),
};
const publishProvider = {
  provide: PublishResource,
  inject: [RESOURCE_REPOSITORY, EVENT_BUS],
  useFactory: (repo: ResourceRepository, bus: EventBus) => new PublishResource(repo, bus),
};
const publicResourcesProvider = {
  provide: GetPublicResources,
  inject: [RESOURCE_REPOSITORY],
  useFactory: (repo: ResourceRepository) => new GetPublicResources(repo),
};

@Module({
  controllers: [ResourcesController, CoordinationController, PublicController],
  providers: [
    dbPoolProvider,
    eventQueueProvider,
    dbProvider,
    busProvider,
    registerProvider,
    queueProvider,
    verifyProvider,
    publishProvider,
    publicResourcesProvider,
  ],
})
export class ResourcesModule implements OnModuleDestroy {
  constructor(
    @Inject(DB_POOL) private readonly dbPool: DbPool,
    @Inject(EVENT_QUEUE) private readonly eventQueue: EventQueue,
  ) {}

  async onModuleDestroy(): Promise<void> {
    try {
      await this.eventQueue.queue.close();
    } catch (_) {
      // ignore — let remaining teardown proceed
    }
    try {
      await this.eventQueue.connection.quit();
    } catch (_) {
      // ignore
    }
    try {
      await this.dbPool.pool.end();
    } catch (_) {
      // ignore
    }
  }
}
