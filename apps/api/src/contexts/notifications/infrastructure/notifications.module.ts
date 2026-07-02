import { Module } from '@nestjs/common';
import { DB, DatabaseModule } from '../../../shared/database.module';
import { Db } from '../../../shared/db';
import { IdentityModule } from '../../identity/infrastructure/identity.module';
import { NotificationsController } from './http/notifications.controller';
import { GetMyNotifications } from '../application/get-my-notifications';
import { MarkNotificationRead } from '../application/mark-notification-read';
import { MarkAllRead } from '../application/mark-all-read';
import { NotificationCreator } from '../application/notification-creator';
import {
  NOTIFICATION_REPOSITORY,
  NotificationRepository,
} from '../domain/ports/notification.repository';
import {
  NOTIFICATIONS_PORT,
  NotificationsPort,
} from '../domain/ports/notifications.port';
import { DrizzleNotificationRepository } from './drizzle/drizzle-notification.repository';
import { ConsumerWorker } from '../../../shared/events/consumer-worker';
import { DrizzleProcessedEventStore } from '../../../shared/events/drizzle-processed-event-store';
import { notifyDonorOnReception } from './notify-donor-on-reception.handler';

const notificationRepositoryProvider = {
  provide: NOTIFICATION_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): NotificationRepository =>
    new DrizzleNotificationRepository(db),
};

const notificationsPortProvider = {
  provide: NOTIFICATIONS_PORT,
  inject: [NOTIFICATION_REPOSITORY],
  useFactory: (repo: NotificationRepository): NotificationsPort =>
    new NotificationCreator(repo),
};

const getMyNotificationsProvider = {
  provide: GetMyNotifications,
  inject: [NOTIFICATION_REPOSITORY],
  useFactory: (repo: NotificationRepository) => new GetMyNotifications(repo),
};

const markNotificationReadProvider = {
  provide: MarkNotificationRead,
  inject: [NOTIFICATION_REPOSITORY],
  useFactory: (repo: NotificationRepository) => new MarkNotificationRead(repo),
};

const markAllReadProvider = {
  provide: MarkAllRead,
  inject: [NOTIFICATION_REPOSITORY],
  useFactory: (repo: NotificationRepository) => new MarkAllRead(repo),
};

// Idempotency ledger for this context's event consumers (#129).
const processedEventStoreProvider = {
  provide: DrizzleProcessedEventStore,
  inject: [DB],
  useFactory: (db: Db) => new DrizzleProcessedEventStore(db),
};

// Notifications consumer of the domain-event fan-out: on a confirmed reception,
// notify the donor (when the donation is linked to a user), at most once.
const donationNotificationsWorkerProvider = {
  provide: ConsumerWorker,
  inject: [DrizzleProcessedEventStore, NOTIFICATIONS_PORT],
  useFactory: (store: DrizzleProcessedEventStore, port: NotificationsPort) =>
    new ConsumerWorker('notifications', store, {
      'donation_intake.received': notifyDonorOnReception(port),
    }),
};

@Module({
  imports: [DatabaseModule, IdentityModule],
  controllers: [NotificationsController],
  providers: [
    notificationRepositoryProvider,
    notificationsPortProvider,
    getMyNotificationsProvider,
    markNotificationReadProvider,
    markAllReadProvider,
    processedEventStoreProvider,
    donationNotificationsWorkerProvider,
  ],
  exports: [NOTIFICATIONS_PORT],
})
export class NotificationsModule {}
