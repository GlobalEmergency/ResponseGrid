import { Inject, Module, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { DB, DatabaseModule } from '../../../shared/database.module';
import { Db } from '../../../shared/db';
import { LogisticsController } from './http/logistics.controller';
import { ShipmentController } from './http/shipment.controller';
import { PublishCapacity } from '../application/publish-capacity';
import { WithdrawCapacity } from '../application/withdraw-capacity';
import { ListCapacities } from '../application/list-capacities';
import { CreateShipment } from '../application/create-shipment';
import { AssignCapacityToShipment } from '../application/assign-capacity-to-shipment';
import { MarkShipmentInTransit } from '../application/mark-shipment-in-transit';
import { ConfirmShipmentDelivery } from '../application/confirm-shipment-delivery';
import { CancelShipment } from '../application/cancel-shipment';
import { ListShipments } from '../application/list-shipments';
import { GetMyShipments } from '../application/get-my-shipments';
import { SuggestCapacitiesForShipment } from '../application/suggest-capacities-for-shipment';
import {
  TRANSPORT_CAPACITY_REPOSITORY,
  TransportCapacityRepository,
} from '../domain/ports/transport-capacity.repository';
import {
  SHIPMENT_REPOSITORY,
  ShipmentRepository,
} from '../domain/ports/shipment.repository';
import {
  SHIPMENT_EVENT_BUS,
  ShipmentEventBus,
} from '../domain/ports/shipment-event-bus';
import {
  SHIPMENT_AUTHORIZATION_LOOKUP,
  ShipmentAuthorizationLookup,
} from '../domain/ports/shipment-authorization-lookup';
import {
  LOGISTICS_EMERGENCY_STATUS_READER,
  LogisticsEmergencyStatusReader,
} from '../domain/ports/emergency-status-reader';
import {
  CAPACITY_EMERGENCY_LOOKUP,
  CapacityEmergencyLookup,
} from '../domain/ports/capacity-emergency-lookup';
import {
  RESOURCE_LOCATION_LOOKUP,
  ResourceLocationLookup,
} from '../domain/ports/resource-location-lookup';
import { DrizzleTransportCapacityRepository } from './drizzle/drizzle-transport-capacity.repository';
import { DrizzleShipmentRepository } from './drizzle/drizzle-shipment.repository';
import { DrizzleShipmentAuthorizationLookup } from './drizzle/drizzle-shipment-authorization-lookup';
import { DrizzleCapacityEmergencyLookup } from './drizzle/drizzle-capacity-emergency-lookup';
import { DrizzleResourceLocationLookup } from './drizzle/drizzle-resource-location-lookup';
import { DrizzleEmergencyStatusReader } from '../../../shared/drizzle-emergency-status-reader';
import { BullMqShipmentEventBus } from './bullmq-shipment-event-bus';
import { IdentityModule } from '../../identity/infrastructure/identity.module';
// MEMBERSHIP_REPOSITORY is exported by IdentityModule and consumed by the
// controllers via @Inject — no factory needed here.
import { SuppliesModule } from '../../supplies/supplies.module';
import {
  CONTAINER_REPOSITORY,
  ContainerRepository,
} from '../../supplies/domain/ports/container.repository';
import {
  SHIPMENT_CONTAINER_PORT,
  ShipmentContainerPort,
} from '../domain/ports/shipment-container-port';
import { SuppliesShipmentContainerAdapter } from './supplies-shipment-container.adapter';

export const SHIPMENT_EVENT_QUEUE = Symbol('ShipmentEventQueue');

interface EventQueue {
  queue: Queue;
  connection: IORedis;
}

const eventQueueProvider = {
  provide: SHIPMENT_EVENT_QUEUE,
  useFactory: (): EventQueue => {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error('REDIS_URL is required');
    const connection = new IORedis(url, { maxRetriesPerRequest: null });
    const queue = new Queue('domain-events', { connection });
    return { queue, connection };
  },
};

const transportCapacityRepositoryProvider = {
  provide: TRANSPORT_CAPACITY_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): TransportCapacityRepository =>
    new DrizzleTransportCapacityRepository(db),
};

const shipmentRepositoryProvider = {
  provide: SHIPMENT_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): ShipmentRepository => new DrizzleShipmentRepository(db),
};

const shipmentAuthorizationLookupProvider = {
  provide: SHIPMENT_AUTHORIZATION_LOOKUP,
  inject: [DB],
  useFactory: (db: Db): ShipmentAuthorizationLookup =>
    new DrizzleShipmentAuthorizationLookup(db),
};

const shipmentEventBusProvider = {
  provide: SHIPMENT_EVENT_BUS,
  inject: [SHIPMENT_EVENT_QUEUE],
  useFactory: (eq: EventQueue): ShipmentEventBus =>
    new BullMqShipmentEventBus(eq.queue),
};

const emergencyStatusReaderProvider = {
  provide: LOGISTICS_EMERGENCY_STATUS_READER,
  inject: [DB],
  useFactory: (db: Db): LogisticsEmergencyStatusReader =>
    new DrizzleEmergencyStatusReader(db),
};

const capacityEmergencyLookupProvider = {
  provide: CAPACITY_EMERGENCY_LOOKUP,
  inject: [DB],
  useFactory: (db: Db): CapacityEmergencyLookup =>
    new DrizzleCapacityEmergencyLookup(db),
};

const resourceLocationLookupProvider = {
  provide: RESOURCE_LOCATION_LOOKUP,
  inject: [DB],
  useFactory: (db: Db): ResourceLocationLookup =>
    new DrizzleResourceLocationLookup(db),
};

const publishCapacityProvider = {
  provide: PublishCapacity,
  inject: [TRANSPORT_CAPACITY_REPOSITORY, LOGISTICS_EMERGENCY_STATUS_READER],
  useFactory: (
    repo: TransportCapacityRepository,
    statusReader: LogisticsEmergencyStatusReader,
  ) => new PublishCapacity(repo, statusReader),
};

const withdrawCapacityProvider = {
  provide: WithdrawCapacity,
  inject: [TRANSPORT_CAPACITY_REPOSITORY],
  useFactory: (repo: TransportCapacityRepository) => new WithdrawCapacity(repo),
};

const listCapacitiesProvider = {
  provide: ListCapacities,
  inject: [TRANSPORT_CAPACITY_REPOSITORY],
  useFactory: (repo: TransportCapacityRepository) => new ListCapacities(repo),
};

const shipmentContainerPortProvider = {
  provide: SHIPMENT_CONTAINER_PORT,
  inject: [CONTAINER_REPOSITORY],
  useFactory: (containers: ContainerRepository): ShipmentContainerPort =>
    new SuppliesShipmentContainerAdapter(containers),
};

const createShipmentProvider = {
  provide: CreateShipment,
  inject: [
    SHIPMENT_REPOSITORY,
    LOGISTICS_EMERGENCY_STATUS_READER,
    SHIPMENT_CONTAINER_PORT,
  ],
  useFactory: (
    repo: ShipmentRepository,
    statusReader: LogisticsEmergencyStatusReader,
    containerPort: ShipmentContainerPort,
  ) => new CreateShipment(repo, statusReader, containerPort),
};

const assignCapacityToShipmentProvider = {
  provide: AssignCapacityToShipment,
  inject: [SHIPMENT_REPOSITORY],
  useFactory: (repo: ShipmentRepository) => new AssignCapacityToShipment(repo),
};

const markShipmentInTransitProvider = {
  provide: MarkShipmentInTransit,
  inject: [SHIPMENT_REPOSITORY],
  useFactory: (repo: ShipmentRepository) => new MarkShipmentInTransit(repo),
};

const confirmShipmentDeliveryProvider = {
  provide: ConfirmShipmentDelivery,
  inject: [SHIPMENT_REPOSITORY, SHIPMENT_EVENT_BUS, SHIPMENT_CONTAINER_PORT],
  useFactory: (
    repo: ShipmentRepository,
    bus: ShipmentEventBus,
    containerPort: ShipmentContainerPort,
  ) => new ConfirmShipmentDelivery(repo, bus, containerPort),
};

const cancelShipmentProvider = {
  provide: CancelShipment,
  inject: [SHIPMENT_REPOSITORY, SHIPMENT_CONTAINER_PORT],
  useFactory: (
    repo: ShipmentRepository,
    containerPort: ShipmentContainerPort,
  ) => new CancelShipment(repo, containerPort),
};

const listShipmentsProvider = {
  provide: ListShipments,
  inject: [SHIPMENT_REPOSITORY],
  useFactory: (repo: ShipmentRepository) => new ListShipments(repo),
};

const getMyShipmentsProvider = {
  provide: GetMyShipments,
  inject: [SHIPMENT_REPOSITORY],
  useFactory: (repo: ShipmentRepository) => new GetMyShipments(repo),
};

const suggestCapacitiesForShipmentProvider = {
  provide: SuggestCapacitiesForShipment,
  inject: [
    SHIPMENT_REPOSITORY,
    TRANSPORT_CAPACITY_REPOSITORY,
    RESOURCE_LOCATION_LOOKUP,
  ],
  useFactory: (
    shipmentRepo: ShipmentRepository,
    capacityRepo: TransportCapacityRepository,
    resourceLocationLookup: ResourceLocationLookup,
  ) =>
    new SuggestCapacitiesForShipment(
      shipmentRepo,
      capacityRepo,
      resourceLocationLookup,
    ),
};

@Module({
  imports: [DatabaseModule, IdentityModule, SuppliesModule],
  controllers: [LogisticsController, ShipmentController],
  providers: [
    eventQueueProvider,
    transportCapacityRepositoryProvider,
    shipmentRepositoryProvider,
    shipmentAuthorizationLookupProvider,
    shipmentEventBusProvider,
    emergencyStatusReaderProvider,
    capacityEmergencyLookupProvider,
    resourceLocationLookupProvider,
    shipmentContainerPortProvider,
    publishCapacityProvider,
    withdrawCapacityProvider,
    listCapacitiesProvider,
    createShipmentProvider,
    assignCapacityToShipmentProvider,
    markShipmentInTransitProvider,
    confirmShipmentDeliveryProvider,
    cancelShipmentProvider,
    listShipmentsProvider,
    getMyShipmentsProvider,
    suggestCapacitiesForShipmentProvider,
  ],
})
export class LogisticsModule implements OnModuleDestroy {
  constructor(
    @Inject(SHIPMENT_EVENT_QUEUE) private readonly eventQueue: EventQueue,
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
