import { and, count, eq, inArray, sql } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { resourcesTable } from './schema';
import { ResourceRepository } from '../../domain/ports/resource.repository';
import { Resource, ResourceSnapshot, Provenance } from '../../domain/resource';
import { ResourceId } from '../../domain/resource-id';
import { EmergencyId } from '../../../../shared/domain/emergency-id';
import {
  ResourceType,
  ResourceStage,
  VerificationLevel,
  PublicStatus,
} from '../../domain/resource-enums';

type Row = typeof resourcesTable.$inferSelect;

/** Raw snake_case row returned by db.execute() (no Drizzle camelCase mapping). */
type RawRow = {
  id: string;
  emergency_id: string;
  type: string;
  stage: string;
  name: string;
  description: string | null;
  address: string;
  latitude: number;
  longitude: number;
  owner_user_id: string;
  owner_organization_id: string | null;
  verification_level: string;
  public_status: string;
  created_at: Date;
  contact: string | null;
  schedule: string | null;
  manager: string | null;
  accepts: string[] | null;
  source_name: string | null;
  external_id: string | null;
  external_updated_at: Date | null;
  country: string | null;
  city: string | null;
  raw: unknown;
};

function rawRowToSnapshot(row: RawRow): ResourceSnapshot {
  const provenance: Provenance | null = row.source_name
    ? {
        sourceName: row.source_name,
        externalId: row.external_id as string,
        externalUpdatedAt: row.external_updated_at ?? null,
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
      latitude: row.latitude,
      longitude: row.longitude,
    },
    ownerUserId: row.owner_user_id,
    ownerOrganizationId: row.owner_organization_id ?? null,
    verificationLevel: row.verification_level as VerificationLevel,
    publicStatus: row.public_status as PublicStatus,
    createdAt: row.created_at,
    contact: row.contact ?? null,
    schedule: row.schedule ?? null,
    manager: row.manager ?? null,
    accepts: row.accepts ?? [],
    country: row.country ?? null,
    city: row.city ?? null,
    provenance,
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

function rowToSnapshot(row: Row): ResourceSnapshot {
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
  };
}

export class DrizzleResourceRepository implements ResourceRepository {
  constructor(private readonly db: Db) {}

  async save(resource: Resource): Promise<void> {
    const s = resource.toSnapshot();
    await this.db
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
        },
      });
  }

  async findById(id: ResourceId): Promise<Resource | null> {
    const rows = await this.db
      .select()
      .from(resourcesTable)
      .where(eq(resourcesTable.id, id.value))
      .limit(1);
    return rows[0] ? Resource.fromSnapshot(rowToSnapshot(rows[0])) : null;
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
    return rows[0] ? Resource.fromSnapshot(rowToSnapshot(rows[0])) : null;
  }

  async findVisiblePaged(
    emergencyId: EmergencyId,
    q: { page: number; limit: number; category?: string; country?: string },
  ): Promise<{ items: Resource[]; total: number }> {
    const VISIBLE = [
      PublicStatus.Active,
      PublicStatus.Saturated,
      PublicStatus.Paused,
    ];
    const offset = (q.page - 1) * q.limit;

    const conditions = [
      eq(resourcesTable.emergencyId, emergencyId.value),
      inArray(resourcesTable.publicStatus, VISIBLE),
    ];

    if (q.category) {
      conditions.push(
        sql`${resourcesTable.accepts} @> ARRAY[${q.category}]::text[]`,
      );
    }
    if (q.country) {
      conditions.push(eq(resourcesTable.country, q.country));
    }

    const whereClause = and(...conditions);

    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(resourcesTable)
        .where(whereClause)
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
    const VISIBLE = [
      PublicStatus.Active,
      PublicStatus.Saturated,
      PublicStatus.Paused,
    ];
    const visibleWhere = and(
      eq(resourcesTable.emergencyId, emergencyId.value),
      inArray(resourcesTable.publicStatus, VISIBLE),
    );

    const visibleArr = sql.join(
      VISIBLE.map((v) => sql`${v}`),
      sql`, `,
    );
    const [totalRows, categoryRows, countryRows] = await Promise.all([
      this.db.select({ cnt: count() }).from(resourcesTable).where(visibleWhere),
      this.db.execute<{ cat: string; cnt: string }>(sql`
        SELECT unnest(accepts) AS cat, count(*)::int AS cnt
        FROM resources
        WHERE emergency_id = ${emergencyId.value}
          AND public_status = ANY(ARRAY[${visibleArr}])
        GROUP BY cat
      `),
      this.db.execute<{ country: string; cnt: string }>(sql`
        SELECT country, count(*)::int AS cnt
        FROM resources
        WHERE emergency_id = ${emergencyId.value}
          AND public_status = ANY(ARRAY[${visibleArr}])
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
    const VISIBLE = [
      PublicStatus.Active,
      PublicStatus.Saturated,
      PublicStatus.Paused,
    ];
    const visibleArr = sql.join(
      VISIBLE.map((v) => sql`${v}`),
      sql`, `,
    );

    type NearbyRow = RawRow & { dist: number };

    const result = await this.db.execute<NearbyRow>(sql`
      SELECT *, earth_distance(ll_to_earth(${q.lat}, ${q.lng}), ll_to_earth(latitude, longitude)) AS dist
      FROM resources
      WHERE emergency_id = ${emergencyId.value}
        AND public_status = ANY(ARRAY[${visibleArr}])
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
