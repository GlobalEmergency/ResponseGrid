import { and, asc, between, count, eq, inArray, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { Db } from '../../../../shared/db';
import { resourcesTable, resourceItemsTable } from './schema';
import { emergenciesTable } from '../../../emergencies/infrastructure/drizzle/schema';
import {
  ResourceRepository,
  ResourceWithEmergency,
} from '../../domain/ports/resource.repository';
import { Resource, ResourceSnapshot, Provenance } from '../../domain/resource';
import { AuthorSnapshot } from '../../../../shared/domain/author';
import {
  rowToSupplyLineSnapshot,
  supplyLineToColumns,
} from '../../../supplies/infrastructure/drizzle/supply-line-columns';
import { ResourceId } from '../../domain/resource-id';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import {
  ResourceType,
  ResourceStage,
  VerificationLevel,
  PublicStatus,
} from '../../domain/resource-enums';

type Row = typeof resourcesTable.$inferSelect;
type ItemsRow = typeof resourceItemsTable.$inferSelect;

function itemsToSnapshots(items: ItemsRow[]) {
  return items.map(rowToSupplyLineSnapshot);
}

/** Operational statuses a resource must be in to appear in any public read. */
const PUBLICLY_VISIBLE_STATUSES = [
  PublicStatus.Active,
  PublicStatus.Saturated,
  PublicStatus.Paused,
];

/**
 * Trust levels the public API is allowed to expose. The public read API is the
 * product's "source of truth", so it must never surface `unverified` points —
 * only `verified`/`official` ones (issue #94). Applied to every public read
 * path (paged list, facets, nearby, in-bounds and single-resource lookup).
 */
const PUBLICLY_VISIBLE_VERIFICATION = [
  VerificationLevel.Verified,
  VerificationLevel.Official,
];

/**
 * Raw snake_case row returned by db.execute() (no Drizzle camelCase mapping).
 * NOTE: the `pg` driver returns timestamptz columns as strings and
 * double-precision columns as strings when going through raw SQL, so we use
 * `unknown` / loose types here and coerce in rawRowToSnapshot().
 */
type RawRow = {
  id: string;
  emergency_id: string;
  type: string;
  stage: string;
  name: string;
  description: string | null;
  address: string;
  latitude: unknown;
  longitude: unknown;
  owner_user_id: string;
  owner_organization_id: string | null;
  verification_level: string;
  public_status: string;
  created_at: unknown;
  contact: string | null;
  schedule: string | null;
  manager: string | null;
  accepts: unknown;
  source_name: string | null;
  external_id: string | null;
  external_updated_at: unknown;
  country: string | null;
  city: string | null;
  raw: unknown;
  is_final_recipient: boolean | null;
  recipient_type: string | null;
  disputed: boolean | null;
  disputed_at: unknown;
  author?: unknown;
};

/**
 * Coerce a raw value from db.execute() to a Date.
 * The pg driver may return timestamptz as a string or already as a Date.
 */
function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  return new Date(value as string);
}

function toDateOrNull(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  return new Date(value as string);
}

/**
 * Parse the PostgreSQL text-array literal returned by the pg driver for
 * raw SQL queries (e.g. `{water,food}`) into a JS string array.
 * If the driver already returned a proper JS array, it is returned as-is.
 */
function toStringArray(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value as string[];
  // PostgreSQL array literal: `{val1,val2}` — strip braces and split.
  const str = (value as string).trim();
  if (str === '{}') return [];
  if (str.startsWith('{') && str.endsWith('}')) {
    return str
      .slice(1, -1)
      .split(',')
      .map((s) => s.trim());
  }
  return [];
}

function rawRowToSnapshot(row: RawRow): ResourceSnapshot {
  const provenance: Provenance | null = row.source_name
    ? {
        sourceName: row.source_name,
        externalId: row.external_id as string,
        externalUpdatedAt: toDateOrNull(row.external_updated_at),
        raw: row.raw ?? null,
      }
    : null;
  return {
    id: row.id,
    emergencyId: row.emergency_id,
    type: row.type as ResourceType,
    stage: row.stage as ResourceStage,
    name: row.name,
    description: row.description ?? null,
    location: {
      address: row.address,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
    },
    ownerUserId: row.owner_user_id,
    ownerOrganizationId: row.owner_organization_id ?? null,
    verificationLevel: row.verification_level as VerificationLevel,
    publicStatus: row.public_status as PublicStatus,
    createdAt: toDate(row.created_at),
    contact: row.contact ?? null,
    schedule: row.schedule ?? null,
    manager: row.manager ?? null,
    accepts: toStringArray(row.accepts),
    country: row.country ?? null,
    city: row.city ?? null,
    provenance,
    isFinalRecipient: row.is_final_recipient ?? false,
    recipientType: row.recipient_type ?? null,
    disputed: row.disputed ?? false,
    disputedAt: toDateOrNull(row.disputed_at),
    author: (row.author as AuthorSnapshot | null | undefined) ?? null,
    // Raw SQL paths (nearby) power the map, which does not render inventory —
    // items are intentionally not hydrated here to keep the payload lean.
    items: [],
  };
}

function rowToProvenance(row: Row): Provenance | null {
  if (!row.sourceName) return null;
  // DB constraint ensures external_id is non-null whenever source_name is set.
  // The cast below is safe: if this throws, the constraint was bypassed.
  return {
    sourceName: row.sourceName,
    externalId: row.externalId as string,
    externalUpdatedAt: row.externalUpdatedAt ?? null,
    raw: row.raw ?? null,
  };
}

function rowToSnapshot(row: Row, items: ItemsRow[] = []): ResourceSnapshot {
  return {
    id: row.id,
    emergencyId: row.emergencyId,
    type: row.type as ResourceType,
    stage: row.stage as ResourceStage,
    name: row.name,
    description: row.description ?? null,
    location: {
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
    },
    ownerUserId: row.ownerUserId,
    ownerOrganizationId: row.ownerOrganizationId ?? null,
    verificationLevel: row.verificationLevel as VerificationLevel,
    publicStatus: row.publicStatus as PublicStatus,
    createdAt: row.createdAt,
    contact: row.contact ?? null,
    schedule: row.schedule ?? null,
    manager: row.manager ?? null,
    accepts: row.accepts ?? [],
    country: row.country ?? null,
    city: row.city ?? null,
    provenance: rowToProvenance(row),
    isFinalRecipient: row.isFinalRecipient ?? false,
    recipientType: row.recipientType ?? null,
    disputed: row.disputed ?? false,
    disputedAt: row.disputedAt ?? null,
    author: row.author ?? null,
    items: itemsToSnapshots(items),
  };
}

export class DrizzleResourceRepository implements ResourceRepository {
  constructor(private readonly db: Db) {}

  /**
   * Load the declared inventory of a single resource. Only the single-resource
   * lookups (findById/findByExternal) hydrate items: the detail page renders
   * inventory, and ingest must preserve it across re-imports. List/map paths
   * deliberately skip this to keep their payloads lean.
   */
  private loadItems(resourceId: string): Promise<ItemsRow[]> {
    return this.db
      .select()
      .from(resourceItemsTable)
      .where(eq(resourceItemsTable.resourceId, resourceId));
  }

  async save(resource: Resource): Promise<void> {
    const s = resource.toSnapshot();
    await this.db.transaction(async (tx) => {
      await tx
        .insert(resourcesTable)
        .values({
          id: s.id,
          emergencyId: s.emergencyId,
          type: s.type,
          stage: s.stage,
          name: s.name,
          description: s.description,
          address: s.location.address,
          latitude: s.location.latitude,
          longitude: s.location.longitude,
          ownerUserId: s.ownerUserId,
          ownerOrganizationId: s.ownerOrganizationId,
          verificationLevel: s.verificationLevel,
          publicStatus: s.publicStatus,
          createdAt: s.createdAt,
          contact: s.contact,
          schedule: s.schedule,
          manager: s.manager,
          accepts: s.accepts,
          country: s.country,
          city: s.city,
          sourceName: s.provenance?.sourceName ?? null,
          externalId: s.provenance?.externalId ?? null,
          externalUpdatedAt: s.provenance?.externalUpdatedAt ?? null,
          raw: s.provenance?.raw ?? null,
          isFinalRecipient: s.isFinalRecipient,
          recipientType: s.recipientType,
          disputed: s.disputed ?? false,
          disputedAt: s.disputedAt ?? null,
          author: s.author ?? null,
        })
        .onConflictDoUpdate({
          target: resourcesTable.id,
          set: {
            verificationLevel: s.verificationLevel,
            publicStatus: s.publicStatus,
            name: s.name,
            contact: s.contact,
            schedule: s.schedule,
            manager: s.manager,
            accepts: s.accepts,
            country: s.country,
            city: s.city,
            sourceName: s.provenance?.sourceName ?? null,
            externalId: s.provenance?.externalId ?? null,
            externalUpdatedAt: s.provenance?.externalUpdatedAt ?? null,
            raw: s.provenance?.raw ?? null,
            isFinalRecipient: s.isFinalRecipient,
            recipientType: s.recipientType,
            disputed: s.disputed ?? false,
            disputedAt: s.disputedAt ?? null,
          },
        });

      // Sync inventory items: delete existing then re-insert (clean replace),
      // mirroring the need_items strategy.
      await tx
        .delete(resourceItemsTable)
        .where(eq(resourceItemsTable.resourceId, s.id));

      if (s.items.length > 0) {
        await tx.insert(resourceItemsTable).values(
          s.items.map((item) => ({
            id: randomUUID(),
            resourceId: s.id,
            ...supplyLineToColumns(item),
          })),
        );
      }
    });
  }

  async findById(id: ResourceId): Promise<Resource | null> {
    const rows = await this.db
      .select()
      .from(resourcesTable)
      .where(eq(resourcesTable.id, id.value))
      .limit(1);
    if (!rows[0]) return null;
    const items = await this.loadItems(rows[0].id);
    return Resource.fromSnapshot(rowToSnapshot(rows[0], items));
  }

  async findPendingByEmergency(emergencyId: EmergencyId): Promise<Resource[]> {
    const rows = await this.db
      .select()
      .from(resourcesTable)
      .where(
        and(
          eq(resourcesTable.emergencyId, emergencyId.value),
          eq(resourcesTable.verificationLevel, VerificationLevel.Unverified),
        ),
      );
    return rows.map((r) => Resource.fromSnapshot(rowToSnapshot(r)));
  }

  async findPendingByEmergencyPaged(
    emergencyId: EmergencyId,
    q: {
      page: number;
      limit: number;
      type?: string;
      q?: string;
    },
  ): Promise<{ items: Resource[]; total: number }> {
    const offset = (q.page - 1) * q.limit;

    const conditions = [
      eq(resourcesTable.emergencyId, emergencyId.value),
      eq(resourcesTable.verificationLevel, VerificationLevel.Unverified),
    ];

    if (q.type) {
      conditions.push(eq(resourcesTable.type, q.type));
    }
    if (q.q) {
      // Escape SQL LIKE metacharacters so the user string is matched literally
      // (mirrors findVisiblePaged). Search spans name, address and city.
      const escaped = q.q.replace(/[%_\\]/g, (c) => `\\${c}`);
      conditions.push(
        sql`(${resourcesTable.name} ILIKE ${'%' + escaped + '%'} OR ${resourcesTable.address} ILIKE ${'%' + escaped + '%'} OR ${resourcesTable.city} ILIKE ${'%' + escaped + '%'})`,
      );
    }

    const whereClause = and(...conditions);

    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(resourcesTable)
        .where(whereClause)
        // Same deterministic order as the public list (#58): points without
        // contact data sink to the bottom, then by name, then id (stable paging).
        .orderBy(
          asc(sql`(${resourcesTable.contact} IS NULL)`),
          asc(resourcesTable.name),
          asc(resourcesTable.id),
        )
        .limit(q.limit)
        .offset(offset),
      this.db.select({ cnt: count() }).from(resourcesTable).where(whereClause),
    ]);

    return {
      items: rows.map((r) => Resource.fromSnapshot(rowToSnapshot(r))),
      total: Number(countRows[0]?.cnt ?? 0),
    };
  }

  async findActiveByEmergency(emergencyId: EmergencyId): Promise<Resource[]> {
    const rows = await this.db
      .select()
      .from(resourcesTable)
      .where(
        and(
          eq(resourcesTable.emergencyId, emergencyId.value),
          eq(resourcesTable.publicStatus, PublicStatus.Active),
        ),
      );
    return rows.map((r) => Resource.fromSnapshot(rowToSnapshot(r)));
  }

  async findByOwnerAndEmergency(
    ownerUserId: string,
    emergencyId: EmergencyId,
  ): Promise<Resource[]> {
    const rows = await this.db
      .select()
      .from(resourcesTable)
      .where(
        and(
          eq(resourcesTable.emergencyId, emergencyId.value),
          eq(resourcesTable.ownerUserId, ownerUserId),
        ),
      );
    return rows.map((r) => Resource.fromSnapshot(rowToSnapshot(r)));
  }

  async findAllPaged(q: {
    page: number;
    limit: number;
    emergencyId?: EmergencyId;
    type?: ResourceType;
    status?: PublicStatus;
    verification?: VerificationLevel;
    q?: string;
  }): Promise<{ items: ResourceWithEmergency[]; total: number }> {
    const offset = (q.page - 1) * q.limit;

    // Admin read: NO status/verification gate. Every filter is optional; with
    // none, this returns every resource of every emergency.
    const conditions = [];
    if (q.emergencyId) {
      conditions.push(eq(resourcesTable.emergencyId, q.emergencyId.value));
    }
    if (q.type) {
      conditions.push(eq(resourcesTable.type, q.type));
    }
    if (q.status) {
      conditions.push(eq(resourcesTable.publicStatus, q.status));
    }
    if (q.verification) {
      conditions.push(eq(resourcesTable.verificationLevel, q.verification));
    }
    if (q.q) {
      // Escape SQL LIKE metacharacters so the user string matches literally
      // (mirrors findVisiblePaged). Search spans name, address and city.
      const escaped = q.q.replace(/[%_\\]/g, (c) => `\\${c}`);
      conditions.push(
        sql`(${resourcesTable.name} ILIKE ${'%' + escaped + '%'} OR ${resourcesTable.address} ILIKE ${'%' + escaped + '%'} OR ${resourcesTable.city} ILIKE ${'%' + escaped + '%'})`,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // LEFT JOIN resolves the emergency name in the same query (no N+1); LEFT so
    // an orphaned resource still appears (name → null) instead of vanishing.
    const [rows, countRows] = await Promise.all([
      this.db
        .select({
          resource: resourcesTable,
          emergencyName: emergenciesTable.name,
        })
        .from(resourcesTable)
        .leftJoin(
          emergenciesTable,
          eq(resourcesTable.emergencyId, emergenciesTable.id),
        )
        .where(whereClause)
        // Newest first: the admin console is an audit/oversight surface where
        // recent registrations matter most; id breaks ties for stable paging.
        .orderBy(sql`${resourcesTable.createdAt} DESC`, asc(resourcesTable.id))
        .limit(q.limit)
        .offset(offset),
      this.db.select({ cnt: count() }).from(resourcesTable).where(whereClause),
    ]);

    return {
      items: rows.map((r) => ({
        resource: Resource.fromSnapshot(rowToSnapshot(r.resource)),
        emergencyName: r.emergencyName ?? null,
      })),
      total: Number(countRows[0]?.cnt ?? 0),
    };
  }

  async findByIdForAdmin(
    id: ResourceId,
  ): Promise<ResourceWithEmergency | null> {
    const rows = await this.db
      .select({
        resource: resourcesTable,
        emergencyName: emergenciesTable.name,
      })
      .from(resourcesTable)
      .leftJoin(
        emergenciesTable,
        eq(resourcesTable.emergencyId, emergenciesTable.id),
      )
      .where(eq(resourcesTable.id, id.value))
      .limit(1);
    if (!rows[0]) return null;
    // Hydrate the declared inventory for the admin ficha (mirrors findById).
    const items = await this.loadItems(rows[0].resource.id);
    return {
      resource: Resource.fromSnapshot(rowToSnapshot(rows[0].resource, items)),
      emergencyName: rows[0].emergencyName ?? null,
    };
  }

  async findVisibleByEmergency(emergencyId: EmergencyId): Promise<Resource[]> {
    const rows = await this.db
      .select()
      .from(resourcesTable)
      .where(
        and(
          eq(resourcesTable.emergencyId, emergencyId.value),
          inArray(resourcesTable.publicStatus, [
            PublicStatus.Active,
            PublicStatus.Saturated,
            PublicStatus.Paused,
          ]),
        ),
      );
    return rows.map((r) => Resource.fromSnapshot(rowToSnapshot(r)));
  }

  async findDisputedByEmergency(emergencyId: EmergencyId): Promise<Resource[]> {
    // Only visible points (Active/Saturated/Paused) belong in the coordination
    // queue: a disputed point later closed or hidden is no longer actionable as
    // a dispute, even if its flag lingers.
    const rows = await this.db
      .select()
      .from(resourcesTable)
      .where(
        and(
          eq(resourcesTable.emergencyId, emergencyId.value),
          eq(resourcesTable.disputed, true),
          inArray(resourcesTable.publicStatus, [
            PublicStatus.Active,
            PublicStatus.Saturated,
            PublicStatus.Paused,
          ]),
        ),
      );
    return rows.map((r) => Resource.fromSnapshot(rowToSnapshot(r)));
  }

  async findByExternal(
    sourceName: string,
    externalId: string,
  ): Promise<Resource | null> {
    const rows = await this.db
      .select()
      .from(resourcesTable)
      .where(
        and(
          eq(resourcesTable.sourceName, sourceName),
          eq(resourcesTable.externalId, externalId),
        ),
      )
      .limit(1);
    if (!rows[0]) return null;
    const items = await this.loadItems(rows[0].id);
    return Resource.fromSnapshot(rowToSnapshot(rows[0], items));
  }

  async findVisiblePaged(
    emergencyId: EmergencyId,
    q: {
      page: number;
      limit: number;
      category?: string;
      country?: string;
      q?: string;
    },
  ): Promise<{ items: Resource[]; total: number }> {
    const offset = (q.page - 1) * q.limit;

    const conditions = [
      eq(resourcesTable.emergencyId, emergencyId.value),
      inArray(resourcesTable.publicStatus, PUBLICLY_VISIBLE_STATUSES),
      inArray(resourcesTable.verificationLevel, PUBLICLY_VISIBLE_VERIFICATION),
    ];

    if (q.category) {
      conditions.push(
        sql`${resourcesTable.accepts} @> ARRAY[${q.category}]::text[]`,
      );
    }
    if (q.country) {
      conditions.push(eq(resourcesTable.country, q.country));
    }
    if (q.q) {
      // Escape SQL LIKE metacharacters in the user-supplied string so they are
      // treated as literals and not wildcards. Facets are NOT filtered by q —
      // they remain emergency-wide aggregates (simpler and intentional).
      const escaped = q.q.replace(/[%_\\]/g, (c) => `\\${c}`);
      conditions.push(
        sql`(${resourcesTable.name} ILIKE ${'%' + escaped + '%'} OR ${resourcesTable.address} ILIKE ${'%' + escaped + '%'} OR ${resourcesTable.city} ILIKE ${'%' + escaped + '%'})`,
      );
    }

    const whereClause = and(...conditions);

    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(resourcesTable)
        .where(whereClause)
        // Deterministic order (#58): points WITHOUT contact data sink to the
        // bottom (they help the citizen less — there is nobody to call). Within
        // each group, order by name, then id as a stable tiebreaker so paging is
        // consistent across pages.
        .orderBy(
          asc(sql`(${resourcesTable.contact} IS NULL)`),
          asc(resourcesTable.name),
          asc(resourcesTable.id),
        )
        .limit(q.limit)
        .offset(offset),
      this.db.select({ cnt: count() }).from(resourcesTable).where(whereClause),
    ]);

    return {
      items: rows.map((r) => Resource.fromSnapshot(rowToSnapshot(r))),
      total: Number(countRows[0]?.cnt ?? 0),
    };
  }

  async facets(emergencyId: EmergencyId): Promise<{
    byCategory: Record<string, number>;
    byCountry: Record<string, number>;
    total: number;
  }> {
    const visibleWhere = and(
      eq(resourcesTable.emergencyId, emergencyId.value),
      inArray(resourcesTable.publicStatus, PUBLICLY_VISIBLE_STATUSES),
      inArray(resourcesTable.verificationLevel, PUBLICLY_VISIBLE_VERIFICATION),
    );

    const visibleArr = sql.join(
      PUBLICLY_VISIBLE_STATUSES.map((v) => sql`${v}`),
      sql`, `,
    );
    const verifiedArr = sql.join(
      PUBLICLY_VISIBLE_VERIFICATION.map((v) => sql`${v}`),
      sql`, `,
    );
    const [totalRows, categoryRows, countryRows] = await Promise.all([
      this.db.select({ cnt: count() }).from(resourcesTable).where(visibleWhere),
      this.db.execute<{ cat: string; cnt: string }>(sql`
        SELECT unnest(accepts) AS cat, count(*)::int AS cnt
        FROM resources
        WHERE emergency_id = ${emergencyId.value}
          AND public_status = ANY(ARRAY[${visibleArr}])
          AND verification_level = ANY(ARRAY[${verifiedArr}])
        GROUP BY cat
      `),
      this.db.execute<{ country: string; cnt: string }>(sql`
        SELECT country, count(*)::int AS cnt
        FROM resources
        WHERE emergency_id = ${emergencyId.value}
          AND public_status = ANY(ARRAY[${visibleArr}])
          AND verification_level = ANY(ARRAY[${verifiedArr}])
          AND country IS NOT NULL
        GROUP BY country
      `),
    ]);

    const byCategory: Record<string, number> = {};
    for (const row of categoryRows.rows) {
      byCategory[row.cat] = Number(row.cnt);
    }

    const byCountry: Record<string, number> = {};
    for (const row of countryRows.rows) {
      if (row.country) byCountry[row.country] = Number(row.cnt);
    }

    return {
      byCategory,
      byCountry,
      total: Number(totalRows[0]?.cnt ?? 0),
    };
  }

  async findNearbyVisible(
    emergencyId: EmergencyId,
    q: { lat: number; lng: number; radiusMeters: number; limit: number },
  ): Promise<Array<{ resource: Resource; distanceMeters: number }>> {
    const visibleArr = sql.join(
      PUBLICLY_VISIBLE_STATUSES.map((v) => sql`${v}`),
      sql`, `,
    );
    const verifiedArr = sql.join(
      PUBLICLY_VISIBLE_VERIFICATION.map((v) => sql`${v}`),
      sql`, `,
    );

    type NearbyRow = RawRow & { dist: number };

    const result = await this.db.execute<NearbyRow>(sql`
      SELECT *, earth_distance(ll_to_earth(${q.lat}, ${q.lng}), ll_to_earth(latitude, longitude)) AS dist
      FROM resources
      WHERE emergency_id = ${emergencyId.value}
        AND public_status = ANY(ARRAY[${visibleArr}])
        AND verification_level = ANY(ARRAY[${verifiedArr}])
        AND earth_box(ll_to_earth(${q.lat}, ${q.lng}), ${q.radiusMeters}) @> ll_to_earth(latitude, longitude)
        AND earth_distance(ll_to_earth(${q.lat}, ${q.lng}), ll_to_earth(latitude, longitude)) <= ${q.radiusMeters}
      ORDER BY dist ASC
      LIMIT ${q.limit}
    `);

    return result.rows.map((row) => ({
      resource: Resource.fromSnapshot(rawRowToSnapshot(row)),
      distanceMeters: Math.round(Number(row.dist)),
    }));
  }

  async findInBounds(
    emergencyId: EmergencyId,
    q: {
      minLat: number;
      minLng: number;
      maxLat: number;
      maxLng: number;
      limit: number;
    },
  ): Promise<Resource[]> {
    const rows = await this.db
      .select()
      .from(resourcesTable)
      .where(
        and(
          eq(resourcesTable.emergencyId, emergencyId.value),
          inArray(resourcesTable.publicStatus, PUBLICLY_VISIBLE_STATUSES),
          inArray(
            resourcesTable.verificationLevel,
            PUBLICLY_VISIBLE_VERIFICATION,
          ),
          between(resourcesTable.latitude, q.minLat, q.maxLat),
          between(resourcesTable.longitude, q.minLng, q.maxLng),
        ),
      )
      .limit(q.limit);
    return rows.map((r) => Resource.fromSnapshot(rowToSnapshot(r)));
  }

  async countByEmergencyGroupedByPublicStatus(
    emergencyId: EmergencyId,
  ): Promise<Record<PublicStatus, number>> {
    const rows = await this.db
      .select({ publicStatus: resourcesTable.publicStatus, cnt: count() })
      .from(resourcesTable)
      .where(eq(resourcesTable.emergencyId, emergencyId.value))
      .groupBy(resourcesTable.publicStatus);

    const result: Record<PublicStatus, number> = {
      [PublicStatus.Hidden]: 0,
      [PublicStatus.Active]: 0,
      [PublicStatus.Saturated]: 0,
      [PublicStatus.Paused]: 0,
      [PublicStatus.Closed]: 0,
    };
    for (const row of rows) {
      const status = row.publicStatus as PublicStatus;
      if (status in result) {
        result[status] = Number(row.cnt);
      }
    }
    return result;
  }
}
