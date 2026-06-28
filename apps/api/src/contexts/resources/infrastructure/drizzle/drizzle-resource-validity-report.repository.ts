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

/**
 * True for the Postgres unique-violation (23505) raised by the
 * `resource_validity_one_open_per_user` partial index — i.e. another open
 * report already exists for this (resource, reporter). The id primary-key
 * conflict is handled by the upsert, so a 23505 escaping the insert can only
 * be this index.
 *
 * Drizzle wraps the driver error ("Failed query: …"), so the pg `code` /
 * `constraint` live on a `cause` further down the chain — walk it.
 */
function isOpenReportUniqueViolation(err: unknown): boolean {
  let current: unknown = err;
  for (let depth = 0; depth < 5 && current != null; depth++) {
    if (typeof current !== 'object') break;
    const e = current as {
      code?: unknown;
      constraint?: unknown;
      cause?: unknown;
    };
    if (
      e.code === '23505' &&
      (e.constraint === 'resource_validity_one_open_per_user' ||
        e.constraint === undefined)
    ) {
      return true;
    }
    current = e.cause;
  }
  return false;
}

export class DrizzleResourceValidityReportRepository implements ResourceValidityReportRepository {
  constructor(private readonly db: Db) {}

  async save(report: ResourceValidityReport): Promise<void> {
    const s = report.toSnapshot();
    try {
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
    } catch (err) {
      // A concurrent first-report by the same user can lose the race for the
      // one-open-per-(resource,reporter) slot: this insert carries a fresh id,
      // so the id-based upsert above doesn't catch it. Fold it into an update
      // of the row that won — the report is still recorded, under that row.
      if (!isOpenReportUniqueViolation(err)) throw err;
      await this.db
        .update(resourceValidityReportsTable)
        .set({
          reason: s.reason,
          note: s.note,
          photoUrls: s.photoUrls,
        })
        .where(
          and(
            eq(resourceValidityReportsTable.resourceId, s.resourceId),
            eq(resourceValidityReportsTable.reporterUserId, s.reporterUserId),
            eq(resourceValidityReportsTable.status, ValidityReportStatus.Open),
          ),
        );
    }
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
