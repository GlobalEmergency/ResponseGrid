import { and, eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { offersTable } from './schema';
import { OfferRepository } from '../../domain/ports/offer.repository';
import {
  DonationOffer,
  DonationOfferSnapshot,
} from '../../domain/donation-offer';
import { OfferId } from '../../domain/offer-id';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import { Category, OfferStatus } from '../../domain/offer-enums';

type OfferRow = typeof offersTable.$inferSelect;

function rowToSnapshot(row: OfferRow): DonationOfferSnapshot {
  return {
    id: row.id,
    emergencyId: row.emergencyId,
    donorUserId: row.donorUserId,
    donorOrganizationId: row.donorOrganizationId ?? null,
    category: row.category as Category,
    description: row.description,
    quantity: row.quantity,
    unit: row.unit ?? null,
    location: {
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
    },
    targetNeedId: row.targetNeedId ?? null,
    matchedNeedId: row.matchedNeedId ?? null,
    status: row.status as OfferStatus,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleOfferRepository implements OfferRepository {
  constructor(private readonly db: Db) {}

  async save(offer: DonationOffer): Promise<void> {
    const s = offer.toSnapshot();
    await this.db
      .insert(offersTable)
      .values({
        id: s.id,
        emergencyId: s.emergencyId,
        donorUserId: s.donorUserId,
        donorOrganizationId: s.donorOrganizationId,
        category: s.category,
        description: s.description,
        quantity: s.quantity,
        unit: s.unit,
        address: s.location.address,
        latitude: s.location.latitude,
        longitude: s.location.longitude,
        targetNeedId: s.targetNeedId,
        matchedNeedId: s.matchedNeedId,
        status: s.status,
        notes: s.notes,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })
      .onConflictDoUpdate({
        target: offersTable.id,
        set: {
          status: s.status,
          matchedNeedId: s.matchedNeedId,
          updatedAt: s.updatedAt,
        },
      });
  }

  async findById(id: OfferId): Promise<DonationOffer | null> {
    const rows = await this.db
      .select()
      .from(offersTable)
      .where(eq(offersTable.id, id.value))
      .limit(1);
    if (!rows[0]) return null;
    return DonationOffer.fromSnapshot(rowToSnapshot(rows[0]));
  }

  async findByEmergencyAndStatus(
    emergencyId: EmergencyId,
    status: OfferStatus,
  ): Promise<DonationOffer[]> {
    const rows = await this.db
      .select()
      .from(offersTable)
      .where(
        and(
          eq(offersTable.emergencyId, emergencyId.value),
          eq(offersTable.status, status),
        ),
      );
    return rows.map((r) => DonationOffer.fromSnapshot(rowToSnapshot(r)));
  }

  async findByMatchedNeedId(needId: string): Promise<DonationOffer[]> {
    const rows = await this.db
      .select()
      .from(offersTable)
      .where(eq(offersTable.matchedNeedId, needId));
    return rows.map((r) => DonationOffer.fromSnapshot(rowToSnapshot(r)));
  }

  async findByDonorAndEmergency(
    donorUserId: string,
    emergencyId: EmergencyId,
  ): Promise<DonationOffer[]> {
    const rows = await this.db
      .select()
      .from(offersTable)
      .where(
        and(
          eq(offersTable.donorUserId, donorUserId),
          eq(offersTable.emergencyId, emergencyId.value),
        ),
      );
    return rows.map((r) => DonationOffer.fromSnapshot(rowToSnapshot(r)));
  }

  async findOpenByEmergencyAndCategory(
    emergencyId: EmergencyId,
    category: string,
  ): Promise<DonationOffer[]> {
    const rows = await this.db
      .select()
      .from(offersTable)
      .where(
        and(
          eq(offersTable.emergencyId, emergencyId.value),
          eq(offersTable.status, OfferStatus.Open),
          eq(offersTable.category, category),
        ),
      );
    return rows.map((r) => DonationOffer.fromSnapshot(rowToSnapshot(r)));
  }
}
