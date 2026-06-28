import { Module } from '@nestjs/common';
import { DB, DatabaseModule } from '../../../shared/database.module';
import { Db } from '../../../shared/db';
import { IdentityModule } from '../../identity/infrastructure/identity.module';
import { ReportsController } from './http/reports.controller';
import { SubmitReport } from '../application/submit-report';
import { GetReportsQueue } from '../application/get-reports-queue';
import { MarkReportReviewed } from '../application/mark-report-reviewed';
import { GetMyReports } from '../application/get-my-reports';
import {
  REPORT_REPOSITORY,
  ReportRepository,
} from '../domain/ports/report.repository';
import { DrizzleReportRepository } from './drizzle/drizzle-report.repository';

const reportRepositoryProvider = {
  provide: REPORT_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): ReportRepository => new DrizzleReportRepository(db),
};

const submitReportProvider = {
  provide: SubmitReport,
  inject: [REPORT_REPOSITORY],
  useFactory: (repo: ReportRepository) => new SubmitReport(repo),
};

const getReportsQueueProvider = {
  provide: GetReportsQueue,
  inject: [REPORT_REPOSITORY],
  useFactory: (repo: ReportRepository) => new GetReportsQueue(repo),
};

const markReportReviewedProvider = {
  provide: MarkReportReviewed,
  inject: [REPORT_REPOSITORY],
  useFactory: (repo: ReportRepository) => new MarkReportReviewed(repo),
};

const getMyReportsProvider = {
  provide: GetMyReports,
  inject: [REPORT_REPOSITORY],
  useFactory: (repo: ReportRepository) => new GetMyReports(repo),
};

@Module({
  imports: [DatabaseModule, IdentityModule],
  controllers: [ReportsController],
  providers: [
    reportRepositoryProvider,
    submitReportProvider,
    getReportsQueueProvider,
    markReportReviewedProvider,
    getMyReportsProvider,
  ],
})
export class ReportsModule {}
