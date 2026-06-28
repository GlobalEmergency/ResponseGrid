import { and, count, eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { resourceValidityReportsTable } from './schema';
import { ResourceValidityReportRepository } from '../../domain/ports/resource-validity-report.repository';
import {
  ResourceValidityReport,
  ResourceValidityReportSnapshot,
  ValidityReason,
  ValidityReportStatus,
} from '../../domain/resource-validity-report';

type Row = typeof resourceValidityReportsTable.$inferSelect;

function rowToSnapshot(row: Row): ResourceValidityReportSnapshot {
  return {
    id: row.id,
    resourceId: row.resourceId,
    emergencyId: row.emergencyId,
    reporterUserId: row.reporterUserId,
    reason: row.reason as ValidityReason,
    note: row.note ?? null,
    photoUrls: row.photoUrls ?? [],
    status: row.status as ValidityReportStatus,
    createdAt: row.createdAt,
    resolvedByUserId: row.resolvedByUserId ?? null,
    resolvedAt: row.resolvedAt ?? null,
  };
}

export class DrizzleResourceValidityReportRepository implements ResourceValidityReportRepository {
  constructor(private readonly db: Db) {}

  async save(report: ResourceValidityReport): Promise<void> {
    const s = report.toSnapshot();
    await this.db
      .insert(resourceValidityReportsTable)
      .values({
        id: s.id,
        resourceId: s.resourceId,
        emergencyId: s.emergencyId,
        reporterUserId: s.reporterUserId,
        reason: s.reason,
        note: s.note,
        photoUrls: s.photoUrls,
        status: s.status,
        createdAt: s.createdAt,
        resolvedByUserId: s.resolvedByUserId,
        resolvedAt: s.resolvedAt,
      })
      .onConflictDoUpdate({
        target: resourceValidityReportsTable.id,
        set: {
          reason: s.reason,
          note: s.note,
          photoUrls: s.photoUrls,
          status: s.status,
          resolvedByUserId: s.resolvedByUserId,
          resolvedAt: s.resolvedAt,
        },
      });
  }

  async findOpenByResourceAndReporter(
    resourceId: string,
    reporterUserId: string,
  ): Promise<ResourceValidityReport | null> {
    const rows = await this.db
      .select()
      .from(resourceValidityReportsTable)
      .where(
        and(
          eq(resourceValidityReportsTable.resourceId, resourceId),
          eq(resourceValidityReportsTable.reporterUserId, reporterUserId),
          eq(resourceValidityReportsTable.status, ValidityReportStatus.Open),
        ),
      )
      .limit(1);
    return rows[0]
      ? ResourceValidityReport.fromSnapshot(rowToSnapshot(rows[0]))
      : null;
  }

  async findOpenByResource(
    resourceId: string,
  ): Promise<ResourceValidityReport[]> {
    const rows = await this.db
      .select()
      .from(resourceValidityReportsTable)
      .where(
        and(
          eq(resourceValidityReportsTable.resourceId, resourceId),
          eq(resourceValidityReportsTable.status, ValidityReportStatus.Open),
        ),
      );
    return rows.map((r) =>
      ResourceValidityReport.fromSnapshot(rowToSnapshot(r)),
    );
  }

  async findByResource(resourceId: string): Promise<ResourceValidityReport[]> {
    const rows = await this.db
      .select()
      .from(resourceValidityReportsTable)
      .where(eq(resourceValidityReportsTable.resourceId, resourceId));
    return rows.map((r) =>
      ResourceValidityReport.fromSnapshot(rowToSnapshot(r)),
    );
  }

  async countOpenByResource(resourceId: string): Promise<number> {
    const rows = await this.db
      .select({ cnt: count() })
      .from(resourceValidityReportsTable)
      .where(
        and(
          eq(resourceValidityReportsTable.resourceId, resourceId),
          eq(resourceValidityReportsTable.status, ValidityReportStatus.Open),
        ),
      );
    return Number(rows[0]?.cnt ?? 0);
  }
}
