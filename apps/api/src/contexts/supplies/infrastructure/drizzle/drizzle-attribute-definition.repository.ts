import { randomUUID } from 'crypto';
import { and, asc, eq, inArray, isNull, or, type SQL } from 'drizzle-orm';
import {
  AttributeDefinition,
  AttributeDataType,
  AttributeDefinitionRepository,
} from '@globalemergency/warehouse-core/catalog';
import { Db } from '../../../../shared/db';
import { attributeDefinitionsTable } from './schema';

type AttributeDefinitionRow = typeof attributeDefinitionsTable.$inferSelect;

/**
 * Persistencia Drizzle del metamodelo `AttributeDefinition` (#396, tenencia #397).
 * Usa el query builder tipado (no SQL crudo) para que timestamptz/jsonb lleguen
 * ya tipados.
 *
 * Tenencia (#397): dos semánticas de scope conviven —
 * - **Visibilidad** (`findByScope`, `findByCategoryAncestry`): sin scope (null)
 *   devuelve sólo las globales; con un `scopeId` de tenant devuelve **global ∪
 *   tenant** (nunca las de otros tenants). El dominio `resolveEffectiveSchema`
 *   fusiona ese superconjunto.
 * - **Identidad exacta** (`findOne`, `save`, `archive`): apuntan a la fila del
 *   scope dado exactamente (global XOR tenant), para que el upsert/archive
 *   globales nunca toquen una fila de tenant y viceversa.
 */
export class DrizzleAttributeDefinitionRepository implements AttributeDefinitionRepository {
  constructor(private readonly db: Db) {}

  async findByScope(scopeId: string | null): Promise<AttributeDefinition[]> {
    const rows = await this.db
      .select()
      .from(attributeDefinitionsTable)
      .where(this.visibilityFilter(scopeId))
      .orderBy(
        asc(attributeDefinitionsTable.categorySlug),
        asc(attributeDefinitionsTable.sort),
        asc(attributeDefinitionsTable.key),
      );
    return rows.map((row) => this.toDefinition(row));
  }

  async findByCategoryAncestry(
    ancestorSlugs: readonly string[],
    scopeId: string | null,
  ): Promise<AttributeDefinition[]> {
    if (ancestorSlugs.length === 0) {
      return [];
    }
    const rows = await this.db
      .select()
      .from(attributeDefinitionsTable)
      .where(
        and(
          inArray(attributeDefinitionsTable.categorySlug, [...ancestorSlugs]),
          this.visibilityFilter(scopeId),
        ),
      )
      .orderBy(
        asc(attributeDefinitionsTable.categorySlug),
        asc(attributeDefinitionsTable.sort),
        asc(attributeDefinitionsTable.key),
      );
    return rows.map((row) => this.toDefinition(row));
  }

  async findOne(
    categorySlug: string,
    key: string,
    scopeId: string | null,
  ): Promise<AttributeDefinition | null> {
    const [row] = await this.db
      .select()
      .from(attributeDefinitionsTable)
      .where(
        and(
          eq(attributeDefinitionsTable.categorySlug, categorySlug),
          eq(attributeDefinitionsTable.key, key),
          this.scopeFilter(scopeId),
        ),
      )
      .limit(1);
    return row ? this.toDefinition(row) : null;
  }

  async save(definition: AttributeDefinition): Promise<void> {
    const s = definition.toSnapshot();
    const now = new Date();
    const existing = await this.findOne(s.categorySlug, s.key, s.scopeId);

    if (!existing) {
      await this.db.insert(attributeDefinitionsTable).values({
        id: randomUUID(),
        categorySlug: s.categorySlug,
        key: s.key,
        dataType: s.dataType,
        required: s.required,
        options: s.options,
        unit: s.unit,
        sort: s.sort,
        scopeId: s.scopeId,
        archivedAt: s.archivedAt,
        createdAt: now,
        updatedAt: now,
      });
      return;
    }

    await this.db
      .update(attributeDefinitionsTable)
      .set({
        dataType: s.dataType,
        required: s.required,
        options: s.options,
        unit: s.unit,
        sort: s.sort,
        archivedAt: s.archivedAt,
        updatedAt: now,
      })
      .where(
        and(
          eq(attributeDefinitionsTable.categorySlug, s.categorySlug),
          eq(attributeDefinitionsTable.key, s.key),
          this.scopeFilter(s.scopeId),
        ),
      );
  }

  async archive(
    categorySlug: string,
    key: string,
    scopeId: string | null,
  ): Promise<void> {
    await this.db
      .update(attributeDefinitionsTable)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(attributeDefinitionsTable.categorySlug, categorySlug),
          eq(attributeDefinitionsTable.key, key),
          this.scopeFilter(scopeId),
        ),
      );
  }

  /** Identidad exacta: la fila del scope dado (global XOR ese tenant). */
  private scopeFilter(scopeId: string | null): SQL | undefined {
    return scopeId === null
      ? isNull(attributeDefinitionsTable.scopeId)
      : eq(attributeDefinitionsTable.scopeId, scopeId);
  }

  /**
   * Visibilidad: sin scope, sólo globales; con tenant, global ∪ tenant (el
   * superconjunto que fusiona `resolveEffectiveSchema`).
   */
  private visibilityFilter(scopeId: string | null): SQL | undefined {
    return scopeId === null
      ? isNull(attributeDefinitionsTable.scopeId)
      : or(
          isNull(attributeDefinitionsTable.scopeId),
          eq(attributeDefinitionsTable.scopeId, scopeId),
        );
  }

  private toDefinition(row: AttributeDefinitionRow): AttributeDefinition {
    return AttributeDefinition.fromSnapshot({
      categorySlug: row.categorySlug,
      key: row.key,
      dataType: row.dataType as AttributeDataType,
      required: row.required,
      options: row.options ?? null,
      unit: row.unit ?? null,
      sort: row.sort,
      scopeId: row.scopeId ?? null,
      archivedAt: row.archivedAt ?? null,
    });
  }
}
