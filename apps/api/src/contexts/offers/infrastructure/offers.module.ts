import { Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { DB, DatabaseModule } from '../../../shared/database.module';
import { Db } from '../../../shared/db';
import { OffersController } from './http/offers.controller';
import { DonationIntakesController } from './http/donation-intakes.controller';
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
import { CreateDonationIntake } from '../application/create-donation-intake';
import { LookupDonorByContact } from '../application/lookup-donor-by-contact';
import { UpdateDonationIntake } from '../application/update-donation-intake';
import { SearchDonationIntakes } from '../application/search-donation-intakes';
import { GetDonationIntakeById } from '../application/get-donation-intake-by-id';
import { ListPendingIntakesByResource } from '../application/list-pending-intakes-by-resource';
import { ConfirmIntakeReception } from '../application/confirm-intake-reception';
import { RejectIntake } from '../application/reject-intake';
import { MarkIntakeIncomplete } from '../application/mark-intake-incomplete';
import { GetIntakeDeepLink } from '../application/get-intake-deep-link';
import {
  INTAKE_QR_ENCODER,
  IntakeQrEncoder,
} from '../domain/ports/intake-qr-encoder';
import { QrcodeIntakeQrEncoder } from './qrcode-intake-qr-encoder';
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
import {
  DONATION_INTAKE_REPOSITORY,
  DonationIntakeRepository,
} from '../domain/ports/donation-intake.repository';
import {
  INTAKE_RESOURCE_LOOKUP,
  IntakeResourceLookup,
} from '../domain/ports/intake-resource-lookup';
import { DrizzleDonationIntakeRepository } from './drizzle/drizzle-donation-intake.repository';
import { DrizzleIntakeResourceLookup } from './drizzle/drizzle-intake-resource-lookup';
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

const donationIntakeRepositoryProvider = {
  provide: DONATION_INTAKE_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): DonationIntakeRepository =>
    new DrizzleDonationIntakeRepository(db),
};

const intakeResourceLookupProvider = {
  provide: INTAKE_RESOURCE_LOOKUP,
  inject: [DB],
  useFactory: (db: Db): IntakeResourceLookup =>
    new DrizzleIntakeResourceLookup(db),
};

const createDonationIntakeProvider = {
  provide: CreateDonationIntake,
  inject: [
    DONATION_INTAKE_REPOSITORY,
    OFFER_EMERGENCY_STATUS_READER,
    INTAKE_RESOURCE_LOOKUP,
  ],
  useFactory: (
    repo: DonationIntakeRepository,
    statusReader: OfferEmergencyStatusReader,
    resourceLookup: IntakeResourceLookup,
  ) => new CreateDonationIntake(repo, statusReader, resourceLookup),
};

const lookupDonorByContactProvider = {
  provide: LookupDonorByContact,
  inject: [DONATION_INTAKE_REPOSITORY],
  useFactory: (repo: DonationIntakeRepository) =>
    new LookupDonorByContact(repo),
};

const updateDonationIntakeProvider = {
  provide: UpdateDonationIntake,
  inject: [DONATION_INTAKE_REPOSITORY],
  useFactory: (repo: DonationIntakeRepository) =>
    new UpdateDonationIntake(repo),
};

const searchDonationIntakesProvider = {
  provide: SearchDonationIntakes,
  inject: [DONATION_INTAKE_REPOSITORY],
  useFactory: (repo: DonationIntakeRepository) =>
    new SearchDonationIntakes(repo),
};

const getDonationIntakeByIdProvider = {
  provide: GetDonationIntakeById,
  inject: [DONATION_INTAKE_REPOSITORY],
  useFactory: (repo: DonationIntakeRepository) =>
    new GetDonationIntakeById(repo),
};

const listPendingIntakesByResourceProvider = {
  provide: ListPendingIntakesByResource,
  inject: [DONATION_INTAKE_REPOSITORY],
  useFactory: (repo: DonationIntakeRepository) =>
    new ListPendingIntakesByResource(repo),
};

const confirmIntakeReceptionProvider = {
  provide: ConfirmIntakeReception,
  inject: [DONATION_INTAKE_REPOSITORY, OFFER_EVENT_BUS],
  useFactory: (repo: DonationIntakeRepository, bus: EventBus) =>
    new ConfirmIntakeReception(repo, bus),
};

const rejectIntakeProvider = {
  provide: RejectIntake,
  inject: [DONATION_INTAKE_REPOSITORY],
  useFactory: (repo: DonationIntakeRepository) => new RejectIntake(repo),
};

const markIntakeIncompleteProvider = {
  provide: MarkIntakeIncomplete,
  inject: [DONATION_INTAKE_REPOSITORY],
  useFactory: (repo: DonationIntakeRepository) =>
    new MarkIntakeIncomplete(repo),
};

const intakeQrEncoderProvider = {
  provide: INTAKE_QR_ENCODER,
  useFactory: (): IntakeQrEncoder => new QrcodeIntakeQrEncoder(),
};

const getIntakeDeepLinkProvider = {
  provide: GetIntakeDeepLink,
  inject: [INTAKE_RESOURCE_LOOKUP, INTAKE_QR_ENCODER],
  useFactory: (lookup: IntakeResourceLookup, encoder: IntakeQrEncoder) =>
    new GetIntakeDeepLink(
      lookup,
      process.env.FRONTEND_URL ?? 'http://localhost:3001',
      encoder,
    ),
};

@Module({
  imports: [DatabaseModule, IdentityModule, NotificationsModule],
  controllers: [OffersController, DonationIntakesController],
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
    donationIntakeRepositoryProvider,
    intakeResourceLookupProvider,
    createDonationIntakeProvider,
    lookupDonorByContactProvider,
    updateDonationIntakeProvider,
    searchDonationIntakesProvider,
    getDonationIntakeByIdProvider,
    listPendingIntakesByResourceProvider,
    confirmIntakeReceptionProvider,
    rejectIntakeProvider,
    markIntakeIncompleteProvider,
    intakeQrEncoderProvider,
    getIntakeDeepLinkProvider,
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
