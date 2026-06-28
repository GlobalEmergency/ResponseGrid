import { Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { DB, DatabaseModule } from '../../../shared/database.module';
import { Db } from '../../../shared/db';
import { OffersController } from './http/offers.controller';
import { SubmitOffer } from '../application/submit-offer';
import { MatchOffer } from '../application/match-offer';
import { MarkOfferFulfilled } from '../application/mark-offer-fulfilled';
import { CancelOffer } from '../application/cancel-offer';
import { EditOffer } from '../application/edit-offer';
import { DiscardOffer } from '../application/discard-offer';
import { GetOffersQueue } from '../application/get-offers-queue';
import { ListOffersForNeed } from '../application/list-offers-for-need';
import { SuggestOffersForNeedWithLocation } from '../application/suggest-offers-for-need';
import { GetMyOffers } from '../application/get-my-offers';
import {
  OFFER_REPOSITORY,
  OfferRepository,
} from '../domain/ports/offer.repository';
import {
  OFFER_EMERGENCY_STATUS_READER,
  OfferEmergencyStatusReader,
} from '../domain/ports/emergency-status-reader';
import { OFFER_EVENT_BUS, EventBus } from '../domain/ports/event-bus';
import { OFFER_NEED_LOOKUP, NeedLookup } from '../domain/ports/need-lookup';
import { DrizzleOfferRepository } from './drizzle/drizzle-offer.repository';
import { DrizzleEmergencyStatusReader } from '../../../shared/drizzle-emergency-status-reader';
import { BullMqOfferEventBus } from './bullmq-event-bus';
import { DrizzleNeedLookup } from './drizzle/drizzle-need-lookup';
import { IdentityModule } from '../../identity/infrastructure/identity.module';
import {
  NOTIFICATIONS_PORT,
  NotificationsPort,
} from '../../notifications/domain/ports/notifications.port';
import { NotificationsModule } from '../../notifications/infrastructure/notifications.module';
// MEMBERSHIP_REPOSITORY and OFFER_EMERGENCY_LOOKUP are exported by IdentityModule
// and consumed by OffersController via @Inject — no factory needed here.

export const OFFER_EVENT_QUEUE = Symbol('OffersEventQueue');

interface EventQueue {
  queue: Queue;
  connection: IORedis;
}

const eventQueueProvider = {
  provide: OFFER_EVENT_QUEUE,
  useFactory: (): EventQueue => {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error('REDIS_URL is required');
    const connection = new IORedis(url, { maxRetriesPerRequest: null });
    const queue = new Queue('domain-events', { connection });
    return { queue, connection };
  },
};

const offerRepositoryProvider = {
  provide: OFFER_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): OfferRepository => new DrizzleOfferRepository(db),
};

const emergencyStatusReaderProvider = {
  provide: OFFER_EMERGENCY_STATUS_READER,
  inject: [DB],
  useFactory: (db: Db): OfferEmergencyStatusReader =>
    new DrizzleEmergencyStatusReader(db),
};

const eventBusProvider = {
  provide: OFFER_EVENT_BUS,
  inject: [OFFER_EVENT_QUEUE],
  useFactory: (eq: EventQueue): EventBus => new BullMqOfferEventBus(eq.queue),
};

const needLookupProvider = {
  provide: OFFER_NEED_LOOKUP,
  inject: [DB],
  useFactory: (db: Db): NeedLookup => new DrizzleNeedLookup(db),
};

const submitOfferProvider = {
  provide: SubmitOffer,
  inject: [
    OFFER_REPOSITORY,
    OFFER_EVENT_BUS,
    OFFER_EMERGENCY_STATUS_READER,
    OFFER_NEED_LOOKUP,
  ],
  useFactory: (
    repo: OfferRepository,
    bus: EventBus,
    statusReader: OfferEmergencyStatusReader,
    needLookup: NeedLookup,
  ) => new SubmitOffer(repo, bus, statusReader, needLookup),
};

const matchOfferProvider = {
  provide: MatchOffer,
  inject: [OFFER_REPOSITORY, OFFER_EVENT_BUS, NOTIFICATIONS_PORT],
  useFactory: (
    repo: OfferRepository,
    bus: EventBus,
    notifications: NotificationsPort,
  ) => new MatchOffer(repo, bus, notifications),
};

const markOfferFulfilledProvider = {
  provide: MarkOfferFulfilled,
  inject: [OFFER_REPOSITORY, OFFER_EVENT_BUS],
  useFactory: (repo: OfferRepository, bus: EventBus) =>
    new MarkOfferFulfilled(repo, bus),
};

const cancelOfferProvider = {
  provide: CancelOffer,
  inject: [OFFER_REPOSITORY, OFFER_EVENT_BUS],
  useFactory: (repo: OfferRepository, bus: EventBus) =>
    new CancelOffer(repo, bus),
};

const editOfferProvider = {
  provide: EditOffer,
  inject: [OFFER_REPOSITORY],
  useFactory: (repo: OfferRepository) => new EditOffer(repo),
};

const discardOfferProvider = {
  provide: DiscardOffer,
  inject: [OFFER_REPOSITORY, OFFER_EVENT_BUS],
  useFactory: (repo: OfferRepository, bus: EventBus) =>
    new DiscardOffer(repo, bus),
};

const getOffersQueueProvider = {
  provide: GetOffersQueue,
  inject: [OFFER_REPOSITORY],
  useFactory: (repo: OfferRepository) => new GetOffersQueue(repo),
};

const listOffersForNeedProvider = {
  provide: ListOffersForNeed,
  inject: [OFFER_REPOSITORY],
  useFactory: (repo: OfferRepository) => new ListOffersForNeed(repo),
};

const suggestOffersForNeedProvider = {
  provide: SuggestOffersForNeedWithLocation,
  inject: [OFFER_REPOSITORY, OFFER_NEED_LOOKUP],
  useFactory: (repo: OfferRepository, needLookup: NeedLookup) =>
    new SuggestOffersForNeedWithLocation(repo, needLookup),
};

const getMyOffersProvider = {
  provide: GetMyOffers,
  inject: [OFFER_REPOSITORY],
  useFactory: (repo: OfferRepository) => new GetMyOffers(repo),
};

@Module({
  imports: [DatabaseModule, IdentityModule, NotificationsModule],
  controllers: [OffersController],
  providers: [
    eventQueueProvider,
    offerRepositoryProvider,
    emergencyStatusReaderProvider,
    eventBusProvider,
    needLookupProvider,
    submitOfferProvider,
    matchOfferProvider,
    markOfferFulfilledProvider,
    cancelOfferProvider,
    editOfferProvider,
    discardOfferProvider,
    getOffersQueueProvider,
    listOffersForNeedProvider,
    suggestOffersForNeedProvider,
    getMyOffersProvider,
  ],
})
export class OffersModule implements OnModuleDestroy {
  constructor(
    @Inject(OFFER_EVENT_QUEUE) private readonly eventQueue: EventQueue,
  ) {}

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
