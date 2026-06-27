import { Module } from '@nestjs/common';
import { DB, DatabaseModule } from '../../../shared/database.module';
import { Db } from '../../../shared/db';
import { ReunificationController } from './http/reunification.controller';
import { CreateMissingPersonReport } from '../application/create-missing-person-report';
import { ListMissingPersonReports } from '../application/list-missing-person-reports';
import { GetMissingPersonReport } from '../application/get-missing-person-report';
import { UpdateReportStatus } from '../application/update-report-status';
import { RegisterSighting } from '../application/register-sighting';
import { SearchByDocumentId } from '../application/search-by-document-id';
import { GetMyReports } from '../application/get-my-reports';
import {
  MISSING_PERSON_REPORT_REPOSITORY,
  MissingPersonReportRepository,
} from '../domain/ports/missing-person-report.repository';
import {
  REUNIFICATION_EMERGENCY_STATUS_READER,
  ReunificationEmergencyStatusReader,
} from '../domain/ports/reunification-emergency-status-reader';
import { DrizzleMissingPersonReportRepository } from './drizzle/drizzle-missing-person-report.repository';
import { DrizzleEmergencyStatusReader } from '../../../shared/drizzle-emergency-status-reader';
import { IdentityModule } from '../../identity/infrastructure/identity.module';
import {
  REUNIFICATION_REPORT_EMERGENCY_LOOKUP,
  RequireReunificationReportCoordinatorGuard,
} from '../../identity/infrastructure/http/require-reunification-report-coordinator.guard';
import { OptionalJwtAuthGuard } from '../../identity/infrastructure/http/optional-jwt-auth.guard';

// ── Repository providers ─────────────────────────────────────────────────────

const reportRepositoryProvider = {
  provide: MISSING_PERSON_REPORT_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): MissingPersonReportRepository =>
    new DrizzleMissingPersonReportRepository(db),
};

const emergencyStatusReaderProvider = {
  provide: REUNIFICATION_EMERGENCY_STATUS_READER,
  inject: [DB],
  useFactory: (db: Db): ReunificationEmergencyStatusReader =>
    new DrizzleEmergencyStatusReader(db),
};

// ── Entity coordinator guard (lookup via repository) ─────────────────────────

const reportEmergencyLookupProvider = {
  provide: REUNIFICATION_REPORT_EMERGENCY_LOOKUP,
  inject: [MISSING_PERSON_REPORT_REPOSITORY],
  useFactory: (repo: MissingPersonReportRepository) => ({
    findEmergencyId: (reportId: string) => repo.findEmergencyId(reportId),
  }),
};

// ── Use case providers ───────────────────────────────────────────────────────

const createReportProvider = {
  provide: CreateMissingPersonReport,
  inject: [
    MISSING_PERSON_REPORT_REPOSITORY,
    REUNIFICATION_EMERGENCY_STATUS_READER,
  ],
  useFactory: (
    repo: MissingPersonReportRepository,
    statusReader: ReunificationEmergencyStatusReader,
  ) => new CreateMissingPersonReport(repo, statusReader),
};

const listReportsProvider = {
  provide: ListMissingPersonReports,
  inject: [MISSING_PERSON_REPORT_REPOSITORY],
  useFactory: (repo: MissingPersonReportRepository) =>
    new ListMissingPersonReports(repo),
};

const getReportProvider = {
  provide: GetMissingPersonReport,
  inject: [MISSING_PERSON_REPORT_REPOSITORY],
  useFactory: (repo: MissingPersonReportRepository) =>
    new GetMissingPersonReport(repo),
};

const updateStatusProvider = {
  provide: UpdateReportStatus,
  inject: [MISSING_PERSON_REPORT_REPOSITORY],
  useFactory: (repo: MissingPersonReportRepository) =>
    new UpdateReportStatus(repo),
};

const registerSightingProvider = {
  provide: RegisterSighting,
  inject: [MISSING_PERSON_REPORT_REPOSITORY],
  useFactory: (repo: MissingPersonReportRepository) =>
    new RegisterSighting(repo),
};

const searchByDocumentIdProvider = {
  provide: SearchByDocumentId,
  inject: [MISSING_PERSON_REPORT_REPOSITORY],
  useFactory: (repo: MissingPersonReportRepository) =>
    new SearchByDocumentId(repo),
};

const getMyReportsProvider = {
  provide: GetMyReports,
  inject: [MISSING_PERSON_REPORT_REPOSITORY],
  useFactory: (repo: MissingPersonReportRepository) => new GetMyReports(repo),
};

@Module({
  imports: [DatabaseModule, IdentityModule],
  controllers: [ReunificationController],
  providers: [
    reportRepositoryProvider,
    emergencyStatusReaderProvider,
    reportEmergencyLookupProvider,
    RequireReunificationReportCoordinatorGuard,
    OptionalJwtAuthGuard,
    createReportProvider,
    listReportsProvider,
    getReportProvider,
    updateStatusProvider,
    registerSightingProvider,
    searchByDocumentIdProvider,
    getMyReportsProvider,
  ],
})
export class ReunificationModule {}
