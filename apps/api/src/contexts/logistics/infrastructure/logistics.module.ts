import { Module } from '@nestjs/common';
import { DB, DatabaseModule } from '../../../shared/database.module';
import { Db } from '../../../shared/db';
import { LogisticsController } from './http/logistics.controller';
import { PublishCapacity } from '../application/publish-capacity';
import { WithdrawCapacity } from '../application/withdraw-capacity';
import { ListCapacities } from '../application/list-capacities';
import {
  TRANSPORT_CAPACITY_REPOSITORY,
  TransportCapacityRepository,
} from '../domain/ports/transport-capacity.repository';
import {
  LOGISTICS_EMERGENCY_STATUS_READER,
  LogisticsEmergencyStatusReader,
} from '../domain/ports/emergency-status-reader';
import {
  CAPACITY_EMERGENCY_LOOKUP,
  CapacityEmergencyLookup,
} from '../domain/ports/capacity-emergency-lookup';
import { DrizzleTransportCapacityRepository } from './drizzle/drizzle-transport-capacity.repository';
import { DrizzleCapacityEmergencyLookup } from './drizzle/drizzle-capacity-emergency-lookup';
import { DrizzleEmergencyStatusReader } from '../../../shared/drizzle-emergency-status-reader';
import { IdentityModule } from '../../identity/infrastructure/identity.module';
// MEMBERSHIP_REPOSITORY is exported by IdentityModule and consumed by
// LogisticsController via @Inject — no factory needed here.

const transportCapacityRepositoryProvider = {
  provide: TRANSPORT_CAPACITY_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): TransportCapacityRepository =>
    new DrizzleTransportCapacityRepository(db),
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
  useFactory: (repo: TransportCapacityRepository) =>
    new WithdrawCapacity(repo),
};

const listCapacitiesProvider = {
  provide: ListCapacities,
  inject: [TRANSPORT_CAPACITY_REPOSITORY],
  useFactory: (repo: TransportCapacityRepository) => new ListCapacities(repo),
};

@Module({
  imports: [DatabaseModule, IdentityModule],
  controllers: [LogisticsController],
  providers: [
    transportCapacityRepositoryProvider,
    emergencyStatusReaderProvider,
    capacityEmergencyLookupProvider,
    publishCapacityProvider,
    withdrawCapacityProvider,
    listCapacitiesProvider,
  ],
})
export class LogisticsModule {}
