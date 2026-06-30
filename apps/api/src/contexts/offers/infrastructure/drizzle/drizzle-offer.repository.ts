import { randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { offersTable, offerItemsTable } from './schema';
import { OfferRepository } from '../../domain/ports/offer.repository';
import {
  DonationOffer,
  DonationOfferSnapshot,
} from '../../domain/donation-offer';
import { OfferId } from '../../domain/offer-id';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import { OfferStatus } from '../../domain/offer-enums';
import {
  rowToSupplyLineSnapshot,
  supplyLineToColumns,
} from '../../../supplies/infrastructure/drizzle/supply-line-columns';

type OfferRow = typeof offersTable.$inferSelect;
type OfferItemRow = typeof offerItemsTable.$inferSelect;

function rowToSnapshot(
  row: OfferRow,
  items: OfferItemRow[],
): DonationOfferSnapshot {
  return {
    id: row.id,
    emergencyId: row.emergencyId,
    donorUserId: row.donorUserId,
    donorOrganizationId: row.donorOrganizationId ?? null,
    items: items.map(rowToSupplyLineSnapshot),
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
    author: row.author ?? null,
  };
}

export class DrizzleOfferRepository implements OfferRepository {
  constructor(private readonly db: Db) {}

  /** Group every offer's lines by offer id in a single query (avoids N+1). */
  private async loadItemsByOffer(
    offerIds: string[],
  ): Promise<Map<string, OfferItemRow[]>> {
    const byOffer = new Map<string, OfferItemRow[]>();
    if (offerIds.length === 0) return byOffer;
    const rows = await this.db
      .select()
      .from(offerItemsTable)
      .where(inArray(offerItemsTable.offerId, offerIds));
    for (const row of rows) {
      const list = byOffer.get(row.offerId) ?? [];
      list.push(row);
      byOffer.set(row.offerId, list);
    }
    return byOffer;
  }

  private async hydrate(rows: OfferRow[]): Promise<DonationOffer[]> {
    const itemsByOffer = await this.loadItemsByOffer(rows.map((r) => r.id));
    return rows.map((r) =>
      DonationOffer.fromSnapshot(
        rowToSnapshot(r, itemsByOffer.get(r.id) ?? []),
      ),
    );
  }

  async save(offer: DonationOffer): Promise<void> {
    const s = offer.toSnapshot();
    await this.db.transaction(async (tx) => {
      await tx
        .insert(offersTable)
        .values({
          id: s.id,
          emergencyId: s.emergencyId,
          donorUserId: s.donorUserId,
          donorOrganizationId: s.donorOrganizationId,
          address: s.location.address,
          latitude: s.location.latitude,
          longitude: s.location.longitude,
          targetNeedId: s.targetNeedId,
          matchedNeedId: s.matchedNeedId,
          status: s.status,
          notes: s.notes,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          author: s.author ?? null,
        })
        .onConflictDoUpdate({
          target: offersTable.id,
          set: {
            status: s.status,
            matchedNeedId: s.matchedNeedId,
            notes: s.notes,
            updatedAt: s.updatedAt,
          },
        });

      // Sync supply lines: delete then re-insert (clean replace), mirroring the
      // need_items / resource_items strategy.
      await tx.delete(offerItemsTable).where(eq(offerItemsTable.offerId, s.id));
      if (s.items.length > 0) {
        await tx.insert(offerItemsTable).values(
          s.items.map((item) => ({
            id: randomUUID(),
            offerId: s.id,
            ...supplyLineToColumns(item),
          })),
        );
      }
    });
  }

  async findById(id: OfferId): Promise<DonationOffer | null> {
    const rows = await this.db
      .select()
      .from(offersTable)
      .where(eq(offersTable.id, id.value))
      .limit(1);
    if (!rows[0]) return null;
    return (await this.hydrate(rows))[0] ?? null;
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
    return this.hydrate(rows);
  }

  async findByMatchedNeedId(needId: string): Promise<DonationOffer[]> {
    const rows = await this.db
      .select()
      .from(offersTable)
      .where(eq(offersTable.matchedNeedId, needId));
    return this.hydrate(rows);
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
    return this.hydrate(rows);
  }

  /**
   * Open offers in the emergency that have at least one line in `category`.
   * Resolves the matching offer ids first, then hydrates each with its full
   * set of lines.
   */
  async findOpenByEmergencyAndCategory(
    emergencyId: EmergencyId,
    category: string,
  ): Promise<DonationOffer[]> {
    const idRows = await this.db
      .selectDistinct({ offerId: offerItemsTable.offerId })
      .from(offerItemsTable)
      .innerJoin(offersTable, eq(offersTable.id, offerItemsTable.offerId))
      .where(
        and(
          eq(offersTable.emergencyId, emergencyId.value),
          eq(offersTable.status, OfferStatus.Open),
          eq(offerItemsTable.category, category),
        ),
      );
    const ids = idRows.map((r) => r.offerId);
    if (ids.length === 0) return [];
    const rows = await this.db
      .select()
      .from(offersTable)
      .where(inArray(offersTable.id, ids));
    return this.hydrate(rows);
  }
}
