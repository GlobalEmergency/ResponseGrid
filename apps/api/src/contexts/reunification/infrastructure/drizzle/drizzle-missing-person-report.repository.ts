import { and, eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { missingPersonReportsTable, sightingsTable } from './schema';
import { MissingPersonReportRepository } from '../../domain/ports/missing-person-report.repository';
import {
  MissingPersonReport,
  MissingPersonReportSnapshot,
} from '../../domain/missing-person-report';
import { MissingPersonReportId } from '../../domain/missing-person-report-id';
import { MissingPersonStatus } from '../../domain/missing-person-status';
import { SightingSnapshot } from '../../domain/sighting';
import { LocationProps } from '../../../../shared/domain/location';

type ReportRow = typeof missingPersonReportsTable.$inferSelect;
type SightingRow = typeof sightingsTable.$inferSelect;

function coordsFromRow(
  address: string | null,
  lat: number | null,
  lon: number | null,
): LocationProps | null {
  if (address !== null && lat !== null && lon !== null) {
    return { address, latitude: lat, longitude: lon };
  }
  return null;
}

function sightingRowToSnapshot(row: SightingRow): SightingSnapshot {
  return {
    id: row.id,
    reportedByUserId: row.reportedByUserId ?? null,
    reportedByName: row.reportedByName ?? null,
    location: row.location,
    coords: coordsFromRow(row.coordsAddress, row.coordsLat, row.coordsLon),
    note: row.note,
    reportedAt: row.reportedAt,
  };
}

function reportRowToSnapshot(
  row: ReportRow,
  sightingRows: SightingRow[],
): MissingPersonReportSnapshot {
  return {
    id: row.id,
    emergencyId: row.emergencyId,
    person: {
      firstName: row.personFirstName,
      lastName: row.personLastName,
      documentId: row.personDocumentId ?? null,
      approximateAge: row.personApproximateAge ?? null,
      lastKnownLocation: row.personLastKnownLocation,
      lastKnownCoords: coordsFromRow(
        row.personLastKnownCoordsAddress,
        row.personLastKnownCoordsLat,
        row.personLastKnownCoordsLon,
      ),
      description: row.personDescription ?? null,
    },
    reporter: {
      userId: row.reporterUserId ?? null,
      name: row.reporterName,
      phone: row.reporterPhone,
      email: row.reporterEmail ?? null,
    },
    status: row.status as MissingPersonStatus,
    consentGiven: row.consentGiven,
    photoUrl: row.photoUrl ?? null,
    sightings: sightingRows.map(sightingRowToSnapshot),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    reviewedByUserId: row.reviewedByUserId ?? null,
    matchNote: row.matchNote ?? null,
  };
}

export class DrizzleMissingPersonReportRepository implements MissingPersonReportRepository {
  constructor(private readonly db: Db) {}

  async save(report: MissingPersonReport): Promise<void> {
    const s = report.toSnapshot();

    await this.db
      .insert(missingPersonReportsTable)
      .values({
        id: s.id,
        emergencyId: s.emergencyId,
        personFirstName: s.person.firstName,
        personLastName: s.person.lastName,
        personDocumentId: s.person.documentId ?? null,
        personApproximateAge: s.person.approximateAge ?? null,
        personLastKnownLocation: s.person.lastKnownLocation,
        personLastKnownCoordsAddress: s.person.lastKnownCoords?.address ?? null,
        personLastKnownCoordsLat: s.person.lastKnownCoords?.latitude ?? null,
        personLastKnownCoordsLon: s.person.lastKnownCoords?.longitude ?? null,
        personDescription: s.person.description ?? null,
        reporterUserId: s.reporter.userId ?? null,
        reporterName: s.reporter.name,
        reporterPhone: s.reporter.phone,
        reporterEmail: s.reporter.email ?? null,
        status: s.status,
        consentGiven: s.consentGiven,
        photoUrl: s.photoUrl ?? null,
        reviewedByUserId: s.reviewedByUserId ?? null,
        matchNote: s.matchNote ?? null,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })
      .onConflictDoUpdate({
        target: missingPersonReportsTable.id,
        set: {
          status: s.status,
          reviewedByUserId: s.reviewedByUserId ?? null,
          matchNote: s.matchNote ?? null,
          updatedAt: s.updatedAt,
        },
      });

    // Delete and re-insert sightings for simplicity (sightings are append-only in practice)
    await this.db
      .delete(sightingsTable)
      .where(eq(sightingsTable.reportId, s.id));

    if (s.sightings.length > 0) {
      await this.db.insert(sightingsTable).values(
        s.sightings.map((sighting) => ({
          id: sighting.id,
          reportId: s.id,
          reportedByUserId: sighting.reportedByUserId ?? null,
          reportedByName: sighting.reportedByName ?? null,
          location: sighting.location,
          coordsAddress: sighting.coords?.address ?? null,
          coordsLat: sighting.coords?.latitude ?? null,
          coordsLon: sighting.coords?.longitude ?? null,
          note: sighting.note,
          reportedAt: sighting.reportedAt,
        })),
      );
    }
  }

  async findById(
    id: MissingPersonReportId,
  ): Promise<MissingPersonReport | null> {
    const rows = await this.db
      .select()
      .from(missingPersonReportsTable)
      .where(eq(missingPersonReportsTable.id, id.value))
      .limit(1);
    if (!rows[0]) return null;
    const sightingRows = await this.db
      .select()
      .from(sightingsTable)
      .where(eq(sightingsTable.reportId, id.value));
    return MissingPersonReport.fromSnapshot(
      reportRowToSnapshot(rows[0], sightingRows),
    );
  }

  async findByEmergency(
    emergencyId: string,
    filters?: { status?: MissingPersonStatus },
  ): Promise<MissingPersonReport[]> {
    const conditions = [eq(missingPersonReportsTable.emergencyId, emergencyId)];
    if (filters?.status !== undefined) {
      conditions.push(eq(missingPersonReportsTable.status, filters.status));
    }
    const rows = await this.db
      .select()
      .from(missingPersonReportsTable)
      .where(and(...conditions));

    return Promise.all(
      rows.map(async (row) => {
        const sightingRows = await this.db
          .select()
          .from(sightingsTable)
          .where(eq(sightingsTable.reportId, row.id));
        return MissingPersonReport.fromSnapshot(
          reportRowToSnapshot(row, sightingRows),
        );
      }),
    );
  }

  async findByDocumentId(
    emergencyId: string,
    documentId: string,
  ): Promise<MissingPersonReport[]> {
    const rows = await this.db
      .select()
      .from(missingPersonReportsTable)
      .where(
        and(
          eq(missingPersonReportsTable.emergencyId, emergencyId),
          eq(missingPersonReportsTable.personDocumentId, documentId),
        ),
      );

    return Promise.all(
      rows.map(async (row) => {
        const sightingRows = await this.db
          .select()
          .from(sightingsTable)
          .where(eq(sightingsTable.reportId, row.id));
        return MissingPersonReport.fromSnapshot(
          reportRowToSnapshot(row, sightingRows),
        );
      }),
    );
  }

  async findByUser(
    emergencyId: string,
    userId: string,
  ): Promise<MissingPersonReport[]> {
    const rows = await this.db
      .select()
      .from(missingPersonReportsTable)
      .where(
        and(
          eq(missingPersonReportsTable.emergencyId, emergencyId),
          eq(missingPersonReportsTable.reporterUserId, userId),
        ),
      );

    return Promise.all(
      rows.map(async (row) => {
        const sightingRows = await this.db
          .select()
          .from(sightingsTable)
          .where(eq(sightingsTable.reportId, row.id));
        return MissingPersonReport.fromSnapshot(
          reportRowToSnapshot(row, sightingRows),
        );
      }),
    );
  }

  async findEmergencyId(reportId: string): Promise<string | null> {
    const rows = await this.db
      .select({ emergencyId: missingPersonReportsTable.emergencyId })
      .from(missingPersonReportsTable)
      .where(eq(missingPersonReportsTable.id, reportId))
      .limit(1);
    return rows[0]?.emergencyId ?? null;
  }
}
