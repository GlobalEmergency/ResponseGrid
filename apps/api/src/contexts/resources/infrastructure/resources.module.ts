import { Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { DB, DatabaseModule } from '../../../shared/database.module';
import { Db } from '../../../shared/db';
import { ResourcesController } from './http/resources.controller';
import { CoordinationController } from './http/coordination.controller';
import { PublicController } from './http/public.controller';
import { AdminResourcesController } from './http/admin.controller';
import { RegisterResource } from '../application/register-resource';
import { GetCoordinationQueue } from '../application/get-coordination-queue';
import { ListResourcesAdmin } from '../application/list-resources-admin';
import { GetResourceAdminDetail } from '../application/get-resource-admin-detail';
import { GetPublicResources } from '../application/get-public-resources';
import { GetResourceFacets } from '../application/get-resource-facets';
import { GetNearbyResources } from '../application/get-nearby-resources';
import { GetResourcesInBounds } from '../application/get-resources-in-bounds';
import { GetPublicResource } from '../application/get-public-resource';
import { GetMyResources } from '../application/get-my-resources';
import { VerifyResource } from '../application/verify-resource';
import { PublishResource } from '../application/publish-resource';
import { EditResource } from '../application/edit-resource';
import { DiscardResource } from '../application/discard-resource';
import { UpdateResourcePublicStatus } from '../application/update-resource-public-status';
import {
  RESOURCE_REPOSITORY,
  ResourceRepository,
} from '../domain/ports/resource.repository';
import {
  RESOURCE_EMERGENCY_STATUS_READER,
  ResourceEmergencyStatusReader,
} from '../domain/ports/emergency-status-reader';
import { EVENT_BUS, EventBus } from '../domain/ports/event-bus';
import { DrizzleResourceRepository } from './drizzle/drizzle-resource.repository';
import { DrizzleEmergencyStatusReader } from '../../../shared/drizzle-emergency-status-reader';
import { DrizzleOrganizationAccreditationReader } from '../../../shared/drizzle-organization-accreditation-reader';
import { BullMqEventBus } from './bullmq-event-bus';
import { IdentityModule } from '../../identity/infrastructure/identity.module';
import {
  ORGANIZATION_ACCREDITATION_READER,
  OrganizationAccreditationReader,
} from '../domain/ports/organization-accreditation-reader';
import {
  RESOURCE_MEMBERSHIP_READER,
  ResourceMembershipReader,
} from '../domain/ports/membership-reader';
import { DrizzleMembershipReader } from './drizzle/drizzle-membership-reader';
import {
  NOTIFICATIONS_PORT,
  NotificationsPort,
} from '../../notifications/domain/ports/notifications.port';
import { NotificationsModule } from '../../notifications/infrastructure/notifications.module';
import { RecipientTypesController } from './http/recipient-types.controller';
import { ListRecipientTypes } from '../application/list-recipient-types';
import {
  RECIPIENT_TYPE_REPOSITORY,
  RecipientTypeRepository,
} from '../domain/ports/recipient-type.repository';
import { DrizzleRecipientTypeRepository } from './drizzle/drizzle-recipient-type.repository';
import { ReportResourceValidity } from '../application/report-resource-validity';
import { ResolveResourceDispute } from '../application/resolve-resource-dispute';
import { GetDisputedResources } from '../application/get-disputed-resources';
import { GetResourceValidityReports } from '../application/get-resource-validity-reports';
import {
  RESOURCE_VALIDITY_REPORT_REPOSITORY,
  ResourceValidityReportRepository,
} from '../domain/ports/resource-validity-report.repository';
import { DrizzleResourceValidityReportRepository } from './drizzle/drizzle-resource-validity-report.repository';

export const EVENT_QUEUE = Symbol('ResourcesEventQueue');

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

const resourceRepositoryProvider = {
  provide: RESOURCE_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): ResourceRepository => new DrizzleResourceRepository(db),
};

const emergencyStatusReaderProvider = {
  provide: RESOURCE_EMERGENCY_STATUS_READER,
  inject: [DB],
  useFactory: (db: Db): ResourceEmergencyStatusReader =>
    new DrizzleEmergencyStatusReader(db),
};

const busProvider = {
  provide: EVENT_BUS,
  inject: [EVENT_QUEUE],
  useFactory: (eventQueue: EventQueue): EventBus =>
    new BullMqEventBus(eventQueue.queue),
};

const registerProvider = {
  provide: RegisterResource,
  inject: [RESOURCE_REPOSITORY, EVENT_BUS, RESOURCE_EMERGENCY_STATUS_READER],
  useFactory: (
    repo: ResourceRepository,
    bus: EventBus,
    statusReader: ResourceEmergencyStatusReader,
  ) => new RegisterResource(repo, bus, statusReader),
};
const queueProvider = {
  provide: GetCoordinationQueue,
  inject: [RESOURCE_REPOSITORY],
  useFactory: (repo: ResourceRepository) => new GetCoordinationQueue(repo),
};
const organizationAccreditationReaderProvider = {
  provide: ORGANIZATION_ACCREDITATION_READER,
  inject: [DB],
  useFactory: (db: Db): OrganizationAccreditationReader =>
    new DrizzleOrganizationAccreditationReader(db),
};

const verifyProvider = {
  provide: VerifyResource,
  inject: [
    RESOURCE_REPOSITORY,
    EVENT_BUS,
    ORGANIZATION_ACCREDITATION_READER,
    NOTIFICATIONS_PORT,
  ],
  useFactory: (
    repo: ResourceRepository,
    bus: EventBus,
    accreditationReader: OrganizationAccreditationReader,
    notifications: NotificationsPort,
  ) => new VerifyResource(repo, bus, accreditationReader, notifications),
};
const publishProvider = {
  provide: PublishResource,
  inject: [RESOURCE_REPOSITORY, EVENT_BUS],
  useFactory: (repo: ResourceRepository, bus: EventBus) =>
    new PublishResource(repo, bus),
};
const editResourceProvider = {
  provide: EditResource,
  inject: [RESOURCE_REPOSITORY],
  useFactory: (repo: ResourceRepository) => new EditResource(repo),
};
const discardResourceProvider = {
  provide: DiscardResource,
  inject: [RESOURCE_REPOSITORY],
  useFactory: (repo: ResourceRepository) => new DiscardResource(repo),
};
const publicResourcesProvider = {
  provide: GetPublicResources,
  inject: [RESOURCE_REPOSITORY],
  useFactory: (repo: ResourceRepository) => new GetPublicResources(repo),
};

const getResourceFacetsProvider = {
  provide: GetResourceFacets,
  inject: [RESOURCE_REPOSITORY],
  useFactory: (repo: ResourceRepository) => new GetResourceFacets(repo),
};

const membershipReaderProvider = {
  provide: RESOURCE_MEMBERSHIP_READER,
  inject: [DB],
  useFactory: (db: Db): ResourceMembershipReader =>
    new DrizzleMembershipReader(db),
};

const updateStatusProvider = {
  provide: UpdateResourcePublicStatus,
  inject: [RESOURCE_REPOSITORY, RESOURCE_MEMBERSHIP_READER],
  useFactory: (
    repo: ResourceRepository,
    membershipReader: ResourceMembershipReader,
  ) => new UpdateResourcePublicStatus(repo, membershipReader),
};

const getNearbyResourcesProvider = {
  provide: GetNearbyResources,
  inject: [RESOURCE_REPOSITORY],
  useFactory: (repo: ResourceRepository) => new GetNearbyResources(repo),
};

const getMyResourcesProvider = {
  provide: GetMyResources,
  inject: [RESOURCE_REPOSITORY],
  useFactory: (repo: ResourceRepository) => new GetMyResources(repo),
};

const getResourcesInBoundsProvider = {
  provide: GetResourcesInBounds,
  inject: [RESOURCE_REPOSITORY],
  useFactory: (repo: ResourceRepository) => new GetResourcesInBounds(repo),
};

const getPublicResourceProvider = {
  provide: GetPublicResource,
  inject: [RESOURCE_REPOSITORY],
  useFactory: (repo: ResourceRepository) => new GetPublicResource(repo),
};

const recipientTypeRepositoryProvider = {
  provide: RECIPIENT_TYPE_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): RecipientTypeRepository =>
    new DrizzleRecipientTypeRepository(db),
};

const listRecipientTypesProvider = {
  provide: ListRecipientTypes,
  inject: [RECIPIENT_TYPE_REPOSITORY],
  useFactory: (repo: RecipientTypeRepository) => new ListRecipientTypes(repo),
};

const validityReportRepositoryProvider = {
  provide: RESOURCE_VALIDITY_REPORT_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): ResourceValidityReportRepository =>
    new DrizzleResourceValidityReportRepository(db),
};

const reportResourceValidityProvider = {
  provide: ReportResourceValidity,
  inject: [RESOURCE_REPOSITORY, RESOURCE_VALIDITY_REPORT_REPOSITORY, EVENT_BUS],
  useFactory: (
    repo: ResourceRepository,
    validityRepo: ResourceValidityReportRepository,
    bus: EventBus,
  ) => {
    const raw = Number(process.env.RESOURCE_DISPUTE_THRESHOLD);
    const threshold = Number.isFinite(raw) && raw > 0 ? raw : undefined;
    return new ReportResourceValidity(repo, validityRepo, bus, threshold);
  },
};

const resolveResourceDisputeProvider = {
  provide: ResolveResourceDispute,
  inject: [RESOURCE_REPOSITORY, RESOURCE_VALIDITY_REPORT_REPOSITORY, EVENT_BUS],
  useFactory: (
    repo: ResourceRepository,
    validityRepo: ResourceValidityReportRepository,
    bus: EventBus,
  ) => new ResolveResourceDispute(repo, validityRepo, bus),
};

const getDisputedResourcesProvider = {
  provide: GetDisputedResources,
  inject: [RESOURCE_REPOSITORY, RESOURCE_VALIDITY_REPORT_REPOSITORY],
  useFactory: (
    repo: ResourceRepository,
    validityRepo: ResourceValidityReportRepository,
  ) => new GetDisputedResources(repo, validityRepo),
};

const getResourceValidityReportsProvider = {
  provide: GetResourceValidityReports,
  inject: [RESOURCE_VALIDITY_REPORT_REPOSITORY],
  useFactory: (validityRepo: ResourceValidityReportRepository) =>
    new GetResourceValidityReports(validityRepo),
};

const listResourcesAdminProvider = {
  provide: ListResourcesAdmin,
  inject: [RESOURCE_REPOSITORY],
  useFactory: (repo: ResourceRepository) => new ListResourcesAdmin(repo),
};

const getResourceAdminDetailProvider = {
  provide: GetResourceAdminDetail,
  inject: [RESOURCE_REPOSITORY, RESOURCE_VALIDITY_REPORT_REPOSITORY],
  useFactory: (
    repo: ResourceRepository,
    validityRepo: ResourceValidityReportRepository,
  ) => new GetResourceAdminDetail(repo, validityRepo),
};

@Module({
  imports: [DatabaseModule, IdentityModule, NotificationsModule],
  controllers: [
    ResourcesController,
    CoordinationController,
    PublicController,
    AdminResourcesController,
    RecipientTypesController,
  ],
  providers: [
    eventQueueProvider,
    resourceRepositoryProvider,
    emergencyStatusReaderProvider,
    organizationAccreditationReaderProvider,
    membershipReaderProvider,
    busProvider,
    registerProvider,
    queueProvider,
    verifyProvider,
    publishProvider,
    editResourceProvider,
    discardResourceProvider,
    publicResourcesProvider,
    getResourceFacetsProvider,
    getNearbyResourcesProvider,
    updateStatusProvider,
    getMyResourcesProvider,
    getResourcesInBoundsProvider,
    getPublicResourceProvider,
    recipientTypeRepositoryProvider,
    listRecipientTypesProvider,
    validityReportRepositoryProvider,
    reportResourceValidityProvider,
    resolveResourceDisputeProvider,
    getDisputedResourcesProvider,
    getResourceValidityReportsProvider,
    listResourcesAdminProvider,
    getResourceAdminDetailProvider,
  ],
})
export class ResourcesModule implements OnModuleDestroy {
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
