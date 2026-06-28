import { Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { DB, DatabaseModule } from '../../../shared/database.module';
import { Db } from '../../../shared/db';
import { NeedsController } from './http/needs.controller';
import { CreateNeed } from '../application/create-need';
import { ValidateNeed } from '../application/validate-need';
import { EditNeed } from '../application/edit-need';
import { DiscardNeed } from '../application/discard-need';
import { GetPublicNeeds } from '../application/get-public-needs';
import { GetNearbyNeeds } from '../application/get-nearby-needs';
import { GetNeedsInBounds } from '../application/get-needs-in-bounds';
import { GetNeedsQueue } from '../application/get-needs-queue';
import { AssignNeedManager } from '../application/assign-need-manager';
import { RenewNeed, GetExpiredNeeds } from '../application/renew-need';
import { SuggestVolunteersForNeed } from '../application/suggest-volunteers-for-need';
import { CreateTaskFromNeed } from '../application/create-task-from-need';
import {
  NEED_REPOSITORY,
  NeedRepository,
} from '../domain/ports/need.repository';
import {
  NEED_EMERGENCY_STATUS_READER,
  NeedEmergencyStatusReader,
} from '../domain/ports/emergency-status-reader';
import { EVENT_BUS, EventBus } from '../domain/ports/event-bus';
import {
  VOLUNTEER_MATCHER_PORT,
  VolunteerMatcherPort,
} from '../domain/ports/volunteer-matcher.port';
import {
  PERSONNEL_TASK_CREATOR_PORT,
  PersonnelTaskCreatorPort,
} from '../domain/ports/personnel-task-creator.port';
import { DrizzleNeedRepository } from './drizzle/drizzle-need.repository';
import { DrizzleEmergencyStatusReader } from '../../../shared/drizzle-emergency-status-reader';
import { BullMqEventBus } from './bullmq-event-bus';
import { IdentityModule } from '../../identity/infrastructure/identity.module';
import { DrizzleVolunteerMatcher } from '../../volunteers/infrastructure/drizzle/drizzle-volunteer-matcher';
import { DrizzlePersonnelTaskCreator } from '../../volunteers/infrastructure/drizzle/drizzle-personnel-task-creator';
import { CreateTask } from '../../volunteers/application/create-task';
import { AssignVolunteerToTask } from '../../volunteers/application/assign-volunteer-to-task';
import { VolunteerRepository } from '../../volunteers/domain/ports/volunteer.repository';
import { TaskRepository } from '../../volunteers/domain/ports/task.repository';
import { DrizzleVolunteerRepository } from '../../volunteers/infrastructure/drizzle/drizzle-volunteer.repository';
import { DrizzleTaskRepository } from '../../volunteers/infrastructure/drizzle/drizzle-task.repository';

export const EVENT_QUEUE = Symbol('NeedsEventQueue');

interface EventQueue {
  queue: Queue;
  connection: IORedis;
}

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

const needRepositoryProvider = {
  provide: NEED_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): NeedRepository => new DrizzleNeedRepository(db),
};

const emergencyStatusReaderProvider = {
  provide: NEED_EMERGENCY_STATUS_READER,
  inject: [DB],
  useFactory: (db: Db): NeedEmergencyStatusReader =>
    new DrizzleEmergencyStatusReader(db),
};

const eventBusProvider = {
  provide: EVENT_BUS,
  inject: [EVENT_QUEUE],
  useFactory: (eventQueue: EventQueue): EventBus =>
    new BullMqEventBus(eventQueue.queue),
};

const createNeedProvider = {
  provide: CreateNeed,
  inject: [NEED_REPOSITORY, EVENT_BUS, NEED_EMERGENCY_STATUS_READER],
  useFactory: (
    repo: NeedRepository,
    bus: EventBus,
    statusReader: NeedEmergencyStatusReader,
  ) => new CreateNeed(repo, bus, statusReader),
};

const validateNeedProvider = {
  provide: ValidateNeed,
  inject: [NEED_REPOSITORY, EVENT_BUS],
  useFactory: (repo: NeedRepository, bus: EventBus) =>
    new ValidateNeed(repo, bus),
};

const editNeedProvider = {
  provide: EditNeed,
  inject: [NEED_REPOSITORY],
  useFactory: (repo: NeedRepository) => new EditNeed(repo),
};

const discardNeedProvider = {
  provide: DiscardNeed,
  inject: [NEED_REPOSITORY, EVENT_BUS],
  useFactory: (repo: NeedRepository, bus: EventBus) =>
    new DiscardNeed(repo, bus),
};

const getPublicNeedsProvider = {
  provide: GetPublicNeeds,
  inject: [NEED_REPOSITORY],
  useFactory: (repo: NeedRepository) => new GetPublicNeeds(repo),
};

const getNearbyNeedsProvider = {
  provide: GetNearbyNeeds,
  inject: [NEED_REPOSITORY],
  useFactory: (repo: NeedRepository) => new GetNearbyNeeds(repo),
};

const getNeedsInBoundsProvider = {
  provide: GetNeedsInBounds,
  inject: [NEED_REPOSITORY],
  useFactory: (repo: NeedRepository) => new GetNeedsInBounds(repo),
};

const getNeedsQueueProvider = {
  provide: GetNeedsQueue,
  inject: [NEED_REPOSITORY],
  useFactory: (repo: NeedRepository) => new GetNeedsQueue(repo),
};

const assignNeedManagerProvider = {
  provide: AssignNeedManager,
  inject: [NEED_REPOSITORY],
  useFactory: (repo: NeedRepository) => new AssignNeedManager(repo),
};

const renewNeedProvider = {
  provide: RenewNeed,
  inject: [NEED_REPOSITORY],
  useFactory: (repo: NeedRepository) => new RenewNeed(repo),
};

const getExpiredNeedsProvider = {
  provide: GetExpiredNeeds,
  inject: [NEED_REPOSITORY],
  useFactory: (repo: NeedRepository) => new GetExpiredNeeds(repo),
};

// ── F05: volunteers for needs — cross-context via ports ──────────────────────
// We build the repos directly from DB instead of registering volunteer tokens
// in this module (would conflict with VolunteersModule token registration).

const volunteerMatcherProvider = {
  provide: VOLUNTEER_MATCHER_PORT,
  inject: [DB],
  useFactory: (db: Db): VolunteerMatcherPort => new DrizzleVolunteerMatcher(db),
};

const personnelTaskCreatorProvider = {
  provide: PERSONNEL_TASK_CREATOR_PORT,
  inject: [DB],
  useFactory: (db: Db): PersonnelTaskCreatorPort => {
    const taskRepo: TaskRepository = new DrizzleTaskRepository(db);
    const volunteerRepo: VolunteerRepository = new DrizzleVolunteerRepository(
      db,
    );
    const createTask = new CreateTask(taskRepo);
    const assignVolunteer = new AssignVolunteerToTask(taskRepo, volunteerRepo);
    return new DrizzlePersonnelTaskCreator(
      createTask,
      assignVolunteer,
      taskRepo,
    );
  },
};

const suggestVolunteersProvider = {
  provide: SuggestVolunteersForNeed,
  inject: [NEED_REPOSITORY, VOLUNTEER_MATCHER_PORT],
  useFactory: (repo: NeedRepository, matcher: VolunteerMatcherPort) =>
    new SuggestVolunteersForNeed(repo, matcher),
};

const createTaskFromNeedProvider = {
  provide: CreateTaskFromNeed,
  inject: [NEED_REPOSITORY, PERSONNEL_TASK_CREATOR_PORT],
  useFactory: (repo: NeedRepository, creator: PersonnelTaskCreatorPort) =>
    new CreateTaskFromNeed(repo, creator),
};

@Module({
  imports: [DatabaseModule, IdentityModule],
  controllers: [NeedsController],
  providers: [
    eventQueueProvider,
    needRepositoryProvider,
    emergencyStatusReaderProvider,
    eventBusProvider,
    createNeedProvider,
    validateNeedProvider,
    editNeedProvider,
    discardNeedProvider,
    getPublicNeedsProvider,
    getNearbyNeedsProvider,
    getNeedsInBoundsProvider,
    getNeedsQueueProvider,
    assignNeedManagerProvider,
    renewNeedProvider,
    getExpiredNeedsProvider,
    // F05: personnel needs ↔ volunteers
    volunteerMatcherProvider,
    personnelTaskCreatorProvider,
    suggestVolunteersProvider,
    createTaskFromNeedProvider,
  ],
})
export class NeedsModule implements OnModuleDestroy {
  constructor(@Inject(EVENT_QUEUE) private readonly eventQueue: EventQueue) {}

  async onModuleDestroy(): Promise<void> {
    try {
      await this.eventQueue.queue.close();
    } catch {
      // ignore — let remaining teardown proceed
    }
    try {
      await this.eventQueue.connection.quit();
    } catch {
      // ignore
    }
  }
}
