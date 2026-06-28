import { and, eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import {
  ReportRepository,
  ReportQueueFilters,
} from '../../domain/ports/report.repository';
import { Report, ReportSnapshot } from '../../domain/report';
import {
  ReportType,
  ReportPriority,
  ReportStatus,
} from '../../domain/report-enums';
import { reportsTable } from './schema';

function rowToSnapshot(row: typeof reportsTable.$inferSelect): ReportSnapshot {
  return {
    id: row.id,
    emergencyId: row.emergencyId,
    resourceId: row.resourceId ?? null,
    reporterUserId: row.reporterUserId,
    type: row.type as ReportType,
    note: row.note,
    photoUrls: row.photoUrls ?? [],
    priority: row.priority as ReportPriority,
    status: row.status as ReportStatus,
    location:
      row.locationAddress != null &&
      row.locationLatitude != null &&
      row.locationLongitude != null
        ? {
            address: row.locationAddress,
            latitude: row.locationLatitude,
            longitude: row.locationLongitude,
          }
        : null,
    createdAt: row.createdAt,
    reviewedAt: row.reviewedAt ?? null,
  };
}

export class DrizzleReportRepository implements ReportRepository {
  constructor(private readonly db: Db) {}

  async save(report: Report): Promise<void> {
    const s = report.toSnapshot();
    await this.db
      .insert(reportsTable)
      .values({
        id: s.id,
        emergencyId: s.emergencyId,
        resourceId: s.resourceId ?? null,
        reporterUserId: s.reporterUserId,
        type: s.type,
        note: s.note,
        photoUrls: s.photoUrls,
        priority: s.priority,
        status: s.status,
        locationAddress: s.location?.address ?? null,
        locationLatitude: s.location?.latitude ?? null,
        locationLongitude: s.location?.longitude ?? null,
        createdAt: s.createdAt,
        reviewedAt: s.reviewedAt ?? null,
      })
      .onConflictDoUpdate({
        target: [reportsTable.id],
        set: {
          status: s.status,
          priority: s.priority,
          reviewedAt: s.reviewedAt ?? null,
        },
      });
  }

  async findById(id: string): Promise<Report | null> {
    const rows = await this.db
      .select()
      .from(reportsTable)
      .where(eq(reportsTable.id, id))
      .limit(1);
    return rows[0] ? Report.fromSnapshot(rowToSnapshot(rows[0])) : null;
  }

  async findByEmergencyId(
    emergencyId: string,
    filters: ReportQueueFilters = {},
  ): Promise<Report[]> {
    const conditions = [eq(reportsTable.emergencyId, emergencyId)];
    if (filters.status)
      conditions.push(eq(reportsTable.status, filters.status));
    if (filters.priority)
      conditions.push(eq(reportsTable.priority, filters.priority));
    if (filters.resourceId)
      conditions.push(eq(reportsTable.resourceId, filters.resourceId));
    if (filters.type) conditions.push(eq(reportsTable.type, filters.type));

    const rows = await this.db
      .select()
      .from(reportsTable)
      .where(and(...conditions));
    return rows.map((r) => Report.fromSnapshot(rowToSnapshot(r)));
  }

  async findByEmergencyIdAndReporter(
    emergencyId: string,
    reporterUserId: string,
  ): Promise<Report[]> {
    const rows = await this.db
      .select()
      .from(reportsTable)
      .where(
        and(
          eq(reportsTable.emergencyId, emergencyId),
          eq(reportsTable.reporterUserId, reporterUserId),
        ),
      );
    return rows.map((r) => Report.fromSnapshot(rowToSnapshot(r)));
  }
}
