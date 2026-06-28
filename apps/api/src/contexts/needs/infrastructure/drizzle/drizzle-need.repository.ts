import {
  and,
  count,
  eq,
  exists,
  gt,
  inArray,
  isNull,
  lt,
  or,
  SQL,
} from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { Db } from '../../../../shared/db';
import { needsTable, needItemsTable } from './schema';
import {
  NeedRepository,
  NeedFilters,
} from '../../domain/ports/need.repository';
import { Need, NeedSnapshot } from '../../domain/need';
import { NeedId } from '../../domain/need-id';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import {
  Priority,
  NeedCategory,
  NeedStatus,
  PersonnelSkill,
} from '../../domain/need-enums';
import { NeedItemSnapshot } from '../../domain/need-item';
import { LocationSensitivity } from '../../../../shared/domain/location-sensitivity';

type NeedsRow = typeof needsTable.$inferSelect;
type ItemsRow = typeof needItemsTable.$inferSelect;

function rowToSnapshot(row: NeedsRow, items: ItemsRow[]): NeedSnapshot {
  return {
    id: row.id,
    emergencyId: row.emergencyId,
    title: row.title,
    description: row.description ?? null,
    location: {
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
    },
    priority: row.priority as Priority,
    requesterUserId: row.requesterUserId,
    requesterOrganizationId: row.requesterOrganizationId ?? null,
    managingOrganizationId: row.managingOrganizationId ?? null,
    locationSensitivity: (row.locationSensitivity ??
      LocationSensitivity.Public) as LocationSensitivity,
    items: items.map(
      (i): NeedItemSnapshot => ({
        name: i.name,
        quantity: i.quantity,
        unit: i.unit ?? null,
        category: i.category as NeedCategory,
      }),
    ),
    status: row.status as NeedStatus,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt ?? null,
    lastVerifiedAt: row.lastVerifiedAt ?? null,
    requiredSkill: (row.requiredSkill as PersonnelSkill) ?? null,
    skillSpecialty: row.skillSpecialty ?? null,
    requestedCount: row.requestedCount ?? null,
    resourceId: row.resourceId ?? null,
  };
}

export class DrizzleNeedRepository implements NeedRepository {
  constructor(private readonly db: Db) {}

  async save(need: Need): Promise<void> {
    const s = need.toSnapshot();

    await this.db.transaction(async (tx) => {
      await tx
        .insert(needsTable)
        .values({
          id: s.id,
          emergencyId: s.emergencyId,
          title: s.title,
          description: s.description,
          address: s.location.address,
          latitude: s.location.latitude,
          longitude: s.location.longitude,
          priority: s.priority,
          requesterUserId: s.requesterUserId,
          requesterOrganizationId: s.requesterOrganizationId,
          managingOrganizationId: s.managingOrganizationId,
          locationSensitivity: s.locationSensitivity,
          status: s.status,
          createdAt: s.createdAt,
          expiresAt: s.expiresAt,
          lastVerifiedAt: s.lastVerifiedAt,
          requiredSkill: s.requiredSkill ?? null,
          skillSpecialty: s.skillSpecialty ?? null,
          requestedCount: s.requestedCount ?? null,
          resourceId: s.resourceId ?? null,
        })
        .onConflictDoUpdate({
          target: needsTable.id,
          set: {
            status: s.status,
            managingOrganizationId: s.managingOrganizationId,
            expiresAt: s.expiresAt,
            lastVerifiedAt: s.lastVerifiedAt,
            requiredSkill: s.requiredSkill ?? null,
            skillSpecialty: s.skillSpecialty ?? null,
            requestedCount: s.requestedCount ?? null,
          },
        });

      // Sync items: delete existing then re-insert (clean replace)
      await tx.delete(needItemsTable).where(eq(needItemsTable.needId, s.id));

      if (s.items.length > 0) {
        await tx.insert(needItemsTable).values(
          s.items.map((item) => ({
            id: randomUUID(),
            needId: s.id,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            category: item.category,
          })),
        );
      }
    });
  }

  async findById(id: NeedId): Promise<Need | null> {
    const rows = await this.db
      .select()
      .from(needsTable)
      .where(eq(needsTable.id, id.value))
      .limit(1);
    if (!rows[0]) return null;
    const items = await this.db
      .select()
      .from(needItemsTable)
      .where(eq(needItemsTable.needId, id.value));
    return Need.fromSnapshot(rowToSnapshot(rows[0], items));
  }

  async findValidatedByEmergency(
    emergencyId: EmergencyId,
    filters?: NeedFilters,
  ): Promise<Need[]> {
    // Exclude expired needs: rows with expires_at NOT NULL AND expires_at < now.
    // Rows with expires_at = NULL (legacy/retrocompat) are always included.
    const now = new Date();
    // Include: expires_at IS NULL  OR  expires_at > now
    const notExpired = or(
      isNull(needsTable.expiresAt),
      gt(needsTable.expiresAt, now),
    ) as SQL;
    return this._findByEmergencyAndStatus(
      emergencyId,
      NeedStatus.Validated,
      filters,
      [notExpired],
    );
  }

  async findExpiredByEmergency(
    emergencyId: EmergencyId,
    filters?: NeedFilters,
  ): Promise<Need[]> {
    const now = new Date();
    // Validated needs where expires_at IS NOT NULL AND expires_at <= now
    const isExpired = lt(needsTable.expiresAt, now);
    return this._findByEmergencyAndStatus(
      emergencyId,
      NeedStatus.Validated,
      filters,
      [isExpired],
    );
  }

  async findPendingByEmergency(
    emergencyId: EmergencyId,
    filters?: NeedFilters,
  ): Promise<Need[]> {
    return this._findByEmergencyAndStatus(
      emergencyId,
      NeedStatus.Pending,
      filters,
    );
  }

  async countByEmergencyGroupedByStatus(
    emergencyId: EmergencyId,
  ): Promise<Record<NeedStatus, number>> {
    const rows = await this.db
      .select({ status: needsTable.status, cnt: count() })
      .from(needsTable)
      .where(eq(needsTable.emergencyId, emergencyId.value))
      .groupBy(needsTable.status);

    // Initialise every status to 0
    const result: Record<NeedStatus, number> = {
      [NeedStatus.Pending]: 0,
      [NeedStatus.Validated]: 0,
      [NeedStatus.Rejected]: 0,
      [NeedStatus.Fulfilled]: 0,
    };
    for (const row of rows) {
      const status = row.status as NeedStatus;
      if (status in result) {
        result[status] = Number(row.cnt);
      }
    }
    return result;
  }

  private async _findByEmergencyAndStatus(
    emergencyId: EmergencyId,
    status: NeedStatus,
    filters?: NeedFilters,
    extraConditions: SQL[] = [],
  ): Promise<Need[]> {
    const conditions: SQL[] = [
      eq(needsTable.emergencyId, emergencyId.value),
      eq(needsTable.status, status),
      ...extraConditions,
    ];

    if (filters?.priority !== undefined) {
      conditions.push(eq(needsTable.priority, filters.priority));
    }

    if (filters?.category !== undefined) {
      const category = filters.category;
      conditions.push(
        exists(
          this.db
            .select({ one: needItemsTable.id })
            .from(needItemsTable)
            .where(
              and(
                eq(needItemsTable.needId, needsTable.id),
                eq(needItemsTable.category, category),
              ),
            ),
        ),
      );
    }

    if (filters?.resourceId !== undefined && filters.resourceId !== null) {
      conditions.push(eq(needsTable.resourceId, filters.resourceId));
    }

    const rows = await this.db
      .select()
      .from(needsTable)
      .where(and(...conditions));

    if (rows.length === 0) return [];

    const needIds = rows.map((r) => r.id);

    // Load ALL items for these needs in a single query, then group in JS
    const allItems = await this.db
      .select()
      .from(needItemsTable)
      .where(inArray(needItemsTable.needId, needIds));

    const itemsByNeedId = new Map<string, ItemsRow[]>();
    for (const item of allItems) {
      const bucket = itemsByNeedId.get(item.needId) ?? [];
      bucket.push(item);
      itemsByNeedId.set(item.needId, bucket);
    }

    return rows.map((r) =>
      Need.fromSnapshot(rowToSnapshot(r, itemsByNeedId.get(r.id) ?? [])),
    );
  }
}
