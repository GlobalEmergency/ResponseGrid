import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import {
  DonationIntake,
  DonationIntakeSnapshot,
} from '../../domain/donation-intake';
import { DonationIntakeId } from '../../domain/donation-intake-id';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import { NeedCategory } from '../../domain/offer-enums';
import { DonationIntakeStatus } from '../../domain/donation-intake-enums';
import { DonationIntakeRepository } from '../../domain/ports/donation-intake.repository';
import {
  donationIntakeLinesTable,
  donationIntakesTable,
} from './donation-intake-schema';

type IntakeRow = typeof donationIntakesTable.$inferSelect;
type LineRow = typeof donationIntakeLinesTable.$inferSelect;

function linesToSnapshot(lines: LineRow[]) {
  return lines
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((line) => ({
      id: line.id,
      category: line.category as NeedCategory,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit ?? null,
      notes: line.notes ?? null,
      sortOrder: line.sortOrder,
    }));
}

function rowToSnapshot(
  row: IntakeRow,
  lines: LineRow[],
): DonationIntakeSnapshot {
  return {
    id: row.id,
    emergencyId: row.emergencyId,
    targetResourceId: row.targetResourceId,
    intakeCode: row.intakeCode,
    status: row.status as DonationIntakeStatus,
    donorName: row.donorName,
    donorPhone: row.donorPhone ?? null,
    donorEmail: row.donorEmail ?? null,
    donorUserId: row.donorUserId ?? null,
    contactNormalized: row.contactNormalized,
    lines: linesToSnapshot(lines),
    volunteerNotes: row.volunteerNotes ?? null,
    evidenceFileKey: row.evidenceFileKey ?? null,
    receivedAt: row.receivedAt ?? null,
    receivedByUserId: row.receivedByUserId ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleDonationIntakeRepository implements DonationIntakeRepository {
  constructor(private readonly db: Db) {}

  async save(intake: DonationIntake): Promise<void> {
    const s = intake.toSnapshot();

    await this.db.transaction(async (tx) => {
      await tx
        .insert(donationIntakesTable)
        .values({
          id: s.id,
          emergencyId: s.emergencyId,
          targetResourceId: s.targetResourceId,
          intakeCode: s.intakeCode,
          status: s.status,
          donorName: s.donorName,
          donorPhone: s.donorPhone,
          donorEmail: s.donorEmail,
          donorUserId: s.donorUserId,
          contactNormalized: s.contactNormalized,
          volunteerNotes: s.volunteerNotes,
          evidenceFileKey: s.evidenceFileKey,
          receivedAt: s.receivedAt,
          receivedByUserId: s.receivedByUserId,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        })
        .onConflictDoUpdate({
          target: donationIntakesTable.id,
          set: {
            status: s.status,
            donorName: s.donorName,
            donorPhone: s.donorPhone,
            donorEmail: s.donorEmail,
            contactNormalized: s.contactNormalized,
            volunteerNotes: s.volunteerNotes,
            evidenceFileKey: s.evidenceFileKey,
            receivedAt: s.receivedAt,
            receivedByUserId: s.receivedByUserId,
            updatedAt: s.updatedAt,
          },
        });

      await tx
        .delete(donationIntakeLinesTable)
        .where(eq(donationIntakeLinesTable.intakeId, s.id));

      if (s.lines.length > 0) {
        await tx.insert(donationIntakeLinesTable).values(
          s.lines.map((line) => ({
            id: line.id,
            intakeId: s.id,
            category: line.category,
            description: line.description,
            quantity: line.quantity,
            unit: line.unit,
            notes: line.notes,
            sortOrder: line.sortOrder,
          })),
        );
      }
    });
  }

  async findById(id: DonationIntakeId): Promise<DonationIntake | null> {
    const rows = await this.db
      .select()
      .from(donationIntakesTable)
      .where(eq(donationIntakesTable.id, id.value))
      .limit(1);
    if (!rows[0]) return null;
    const lines = await this.loadLines(rows[0].id);
    return DonationIntake.fromSnapshot(rowToSnapshot(rows[0], lines));
  }

  async findByEmergencyAndCode(
    emergencyId: EmergencyId,
    intakeCode: string,
  ): Promise<DonationIntake | null> {
    const rows = await this.db
      .select()
      .from(donationIntakesTable)
      .where(
        and(
          eq(donationIntakesTable.emergencyId, emergencyId.value),
          eq(donationIntakesTable.intakeCode, intakeCode.toUpperCase()),
        ),
      )
      .limit(1);
    if (!rows[0]) return null;
    const lines = await this.loadLines(rows[0].id);
    return DonationIntake.fromSnapshot(rowToSnapshot(rows[0], lines));
  }

  async existsCode(
    emergencyId: EmergencyId,
    intakeCode: string,
  ): Promise<boolean> {
    const rows = await this.db
      .select({ id: donationIntakesTable.id })
      .from(donationIntakesTable)
      .where(
        and(
          eq(donationIntakesTable.emergencyId, emergencyId.value),
          eq(donationIntakesTable.intakeCode, intakeCode),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  async search(
    emergencyId: EmergencyId,
    query: string,
  ): Promise<DonationIntake[]> {
    const trimmed = query.trim();
    const upper = trimmed.toUpperCase();
    const conditions = [
      eq(donationIntakesTable.emergencyId, emergencyId.value),
    ];

    const codeMatch = /^ACO-[A-Z0-9]{4}$/i.test(trimmed);
    if (codeMatch) {
      conditions.push(eq(donationIntakesTable.intakeCode, upper));
    } else {
      const digits = trimmed.replace(/\D/g, '');
      const like = `%${trimmed.replace(/[%_]/g, '')}%`;
      const parts = [
        ilike(donationIntakesTable.donorName, like),
        ilike(donationIntakesTable.donorEmail, like),
      ];
      if (digits.length > 0) {
        parts.push(
          sql`regexp_replace(coalesce(${donationIntakesTable.donorPhone}, ''), '[^0-9]', '', 'g') LIKE ${'%' + digits + '%'}`,
        );
      }
      conditions.push(or(...parts)!);
    }

    const rows = await this.db
      .select()
      .from(donationIntakesTable)
      .where(and(...conditions))
      .orderBy(desc(donationIntakesTable.createdAt))
      .limit(50);

    return this.hydrateMany(rows);
  }

  async findPendingByResource(resourceId: string): Promise<DonationIntake[]> {
    const rows = await this.db
      .select()
      .from(donationIntakesTable)
      .where(
        and(
          eq(donationIntakesTable.targetResourceId, resourceId),
          eq(donationIntakesTable.status, DonationIntakeStatus.Pending),
        ),
      )
      .orderBy(asc(donationIntakesTable.createdAt));

    return this.hydrateMany(rows);
  }

  async findPendingByContact(
    emergencyId: EmergencyId,
    contactNormalized: string,
  ): Promise<DonationIntake[]> {
    const rows = await this.db
      .select()
      .from(donationIntakesTable)
      .where(
        and(
          eq(donationIntakesTable.emergencyId, emergencyId.value),
          eq(donationIntakesTable.contactNormalized, contactNormalized),
          eq(donationIntakesTable.status, DonationIntakeStatus.Pending),
        ),
      )
      .orderBy(asc(donationIntakesTable.createdAt));

    return this.hydrateMany(rows);
  }

  async findLatestDonorNameByContact(
    emergencyId: EmergencyId,
    contactNormalized: string,
  ): Promise<string | null> {
    const rows = await this.db
      .select({ donorName: donationIntakesTable.donorName })
      .from(donationIntakesTable)
      .where(
        and(
          eq(donationIntakesTable.emergencyId, emergencyId.value),
          eq(donationIntakesTable.contactNormalized, contactNormalized),
        ),
      )
      .orderBy(desc(donationIntakesTable.createdAt))
      .limit(1);
    return rows[0]?.donorName ?? null;
  }

  private async loadLines(intakeId: string): Promise<LineRow[]> {
    return this.db
      .select()
      .from(donationIntakeLinesTable)
      .where(eq(donationIntakeLinesTable.intakeId, intakeId))
      .orderBy(asc(donationIntakeLinesTable.sortOrder));
  }

  private async hydrateMany(rows: IntakeRow[]): Promise<DonationIntake[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const allLines = await this.db
      .select()
      .from(donationIntakeLinesTable)
      .where(inArray(donationIntakeLinesTable.intakeId, ids));

    const linesByIntake = new Map<string, LineRow[]>();
    for (const line of allLines) {
      const bucket = linesByIntake.get(line.intakeId) ?? [];
      bucket.push(line);
      linesByIntake.set(line.intakeId, bucket);
    }

    return rows.map((row) =>
      DonationIntake.fromSnapshot(
        rowToSnapshot(row, linesByIntake.get(row.id) ?? []),
      ),
    );
  }
}
