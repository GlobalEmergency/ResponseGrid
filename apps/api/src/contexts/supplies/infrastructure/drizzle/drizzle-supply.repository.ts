import {
  and,
  asc,
  eq,
  ilike,
  isNull,
  ne,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import {
  Supply,
  SupplyStatus,
  SupplyAlias,
  AliasConflictError,
  SupplyListFilter,
  SupplyRepository,
  SupplyTranslationInput,
} from '@globalemergency/warehouse-core/catalog';
import {
  suppliesTable,
  supplyAliasesTable,
  supplyTranslationsTable,
} from './schema';

type SupplyRow = typeof suppliesTable.$inferSelect;
type SupplyTranslationRow = typeof supplyTranslationsTable.$inferInsert;

/**
 * Persistencia del agregado `Supply` (escritura / gestión interna). La cara
 * pública del catálogo se sirve aparte vía `SupplyCatalogReadModel`.
 */
export class DrizzleSupplyRepository implements SupplyRepository {
  constructor(private readonly db: Db) {}

  async findById(id: string): Promise<Supply | null> {
    const [row] = await this.db
      .select()
      .from(suppliesTable)
      .where(eq(suppliesTable.id, id))
      .limit(1);
    return row ? this.toSupply(row) : null;
  }

  async findByCode(
    code: string,
    scopeId: string | null = null,
  ): Promise<Supply | null> {
    // Búsqueda por código normalizada a mayúsculas (los códigos canónicos son
    // 'INS-NNNN', lo que permite usar el índice único). Tenencia (#397): global
    // por defecto; con tenant busca en global ∪ tenant.
    const normalized = code.trim().toUpperCase();
    const [row] = await this.db
      .select()
      .from(suppliesTable)
      .where(
        and(eq(suppliesTable.code, normalized), this.supplyVisibility(scopeId)),
      )
      .limit(1);
    return row ? this.toSupply(row) : null;
  }

  async save(
    supply: Supply,
    translations?: readonly SupplyTranslationInput[],
  ): Promise<void> {
    const s = supply.toSnapshot();
    const now = new Date();
    const values = {
      id: s.id,
      code: s.code,
      name: s.name,
      status: s.status,
      registrationNotes: s.registrationNotes,
      categorySlug: s.categorySlug,
      defaultUnit: s.defaultUnit,
      attributes: s.attributes,
      variantOfId: s.variantOfId,
      scopeId: s.scopeId,
      createdAt: now,
      updatedAt: now,
    };
    const onConflict = {
      target: suppliesTable.id,
      set: {
        name: s.name,
        status: s.status,
        registrationNotes: s.registrationNotes,
        categorySlug: s.categorySlug,
        defaultUnit: s.defaultUnit,
        attributes: s.attributes,
        variantOfId: s.variantOfId,
        updatedAt: now,
      },
    };

    // Sin traducciones: upsert simple, sin tocar `supply_translations`.
    if (translations === undefined) {
      await this.db
        .insert(suppliesTable)
        .values(values)
        .onConflictDoUpdate(onConflict);
      return;
    }

    // Con traducciones: upsert + reemplazo atómico del set de i18n.
    const rows = this.normalizeTranslationRows(s.id, translations);
    await this.db.transaction(async (tx) => {
      await tx
        .insert(suppliesTable)
        .values(values)
        .onConflictDoUpdate(onConflict);
      await tx
        .delete(supplyTranslationsTable)
        .where(eq(supplyTranslationsTable.supplyId, s.id));
      if (rows.length > 0) {
        await tx.insert(supplyTranslationsTable).values(rows);
      }
    });
  }

  /**
   * Normaliza y deduplica las traducciones a filas de `supply_translations`:
   * `locale` a minúsculas, `name` sin espacios sobrantes, descartando entradas
   * vacías. La última entrada de un mismo locale gana. El nombre base (`es`)
   * vive en `supplies.name`; aquí se persiste lo que declara el admin.
   */
  private normalizeTranslationRows(
    supplyId: string,
    translations: readonly SupplyTranslationInput[],
  ): SupplyTranslationRow[] {
    const entries = new Map<string, string>();
    for (const t of translations) {
      const locale = t.locale.trim().toLowerCase();
      const name = t.name.trim();
      if (!locale || !name) {
        continue;
      }
      entries.set(locale, name);
    }
    return [...entries.entries()].map(([locale, name]) => ({
      supplyId,
      locale,
      name,
    }));
  }

  async listTranslations(supplyId: string): Promise<SupplyTranslationInput[]> {
    const rows = await this.db
      .select()
      .from(supplyTranslationsTable)
      .where(eq(supplyTranslationsTable.supplyId, supplyId))
      .orderBy(asc(supplyTranslationsTable.locale));
    return rows.map((r) => ({ locale: r.locale, name: r.name }));
  }

  async nextSequenceValue(): Promise<number> {
    // nextval devuelve bigint -> string; la secuencia se siembra por encima del
    // máximo sembrado en la migración 0042.
    const result = await this.db.execute<{ value: string }>(
      sql`SELECT nextval('supply_code_seq') AS value`,
    );
    const next = Number(result.rows[0]?.value);
    if (!Number.isInteger(next) || next < 1) {
      throw new Error('Supply code sequence allocation returned no row');
    }
    return next;
  }

  async list(filter: SupplyListFilter): Promise<Supply[]> {
    const conditions: SQL[] = [];
    // Tenencia (#397): visibilidad por scope. Sin scope, sólo globales.
    const visibility = this.supplyVisibility(filter.scopeId);
    if (visibility) {
      conditions.push(visibility);
    }
    if (filter.status) {
      conditions.push(eq(suppliesTable.status, filter.status));
    }
    if (filter.categorySlug) {
      conditions.push(eq(suppliesTable.categorySlug, filter.categorySlug));
    }
    const q = filter.q?.trim();
    if (q) {
      const like = `%${q}%`;
      conditions.push(
        or(
          ilike(suppliesTable.code, like),
          ilike(suppliesTable.name, like),
        ) as SQL,
      );
    }
    const rows = await this.db
      .select()
      .from(suppliesTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(asc(suppliesTable.code));
    return rows.map((row) => this.toSupply(row));
  }

  async listAliases(supplyId: string): Promise<SupplyAlias[]> {
    const rows = await this.db
      .select()
      .from(supplyAliasesTable)
      .where(eq(supplyAliasesTable.supplyId, supplyId))
      .orderBy(asc(supplyAliasesTable.aliasNorm));
    return rows.map((r) =>
      SupplyAlias.fromSnapshot({
        alias: r.aliasNorm,
        supplyId: r.supplyId,
        scopeId: r.scopeId ?? null,
      }),
    );
  }

  async addAlias(alias: SupplyAlias): Promise<void> {
    const aliasNorm = SupplyAlias.normalize(alias.alias);
    const scopeId = alias.scopeId;
    // La unicidad del alias es por scope (#397): el candado global no ve los de
    // tenant y viceversa. Se comprueba el conflicto dentro del mismo scope.
    const [existing] = await this.db
      .select()
      .from(supplyAliasesTable)
      .where(
        and(
          eq(supplyAliasesTable.aliasNorm, aliasNorm),
          scopeId === null
            ? isNull(supplyAliasesTable.scopeId)
            : eq(supplyAliasesTable.scopeId, scopeId),
        ),
      )
      .limit(1);
    if (existing) {
      // Idempotente si ya apunta al mismo insumo; conflicto si apunta a otro.
      if (existing.supplyId === alias.supplyId) return;
      throw new AliasConflictError(aliasNorm);
    }
    await this.db
      .insert(supplyAliasesTable)
      .values({ aliasNorm, supplyId: alias.supplyId, scopeId });
  }

  async removeAlias(
    aliasNorm: string,
    scopeId: string | null = null,
  ): Promise<void> {
    await this.db
      .delete(supplyAliasesTable)
      .where(
        and(
          eq(supplyAliasesTable.aliasNorm, SupplyAlias.normalize(aliasNorm)),
          scopeId === null
            ? isNull(supplyAliasesTable.scopeId)
            : eq(supplyAliasesTable.scopeId, scopeId),
        ),
      );
  }

  async merge(sourceId: string, targetId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Mueve los alias de A a B. `alias_norm` es PK global (un alias mapea a un
      // solo insumo), así que A y B nunca comparten alias y el UPDATE no choca.
      await tx
        .update(supplyAliasesTable)
        .set({ supplyId: targetId })
        .where(eq(supplyAliasesTable.supplyId, sourceId));
      // Repunta las variantes hijas de A a B (excluyendo al propio B si era hijo de A).
      await tx
        .update(suppliesTable)
        .set({ variantOfId: targetId, updatedAt: new Date() })
        .where(
          and(
            eq(suppliesTable.variantOfId, sourceId),
            ne(suppliesTable.id, targetId),
          ),
        );
      // Si B era variante de A, ahora B es el canónico y deja de ser variante (se vuelve raíz).
      await tx
        .update(suppliesTable)
        .set({ variantOfId: null, updatedAt: new Date() })
        .where(
          and(
            eq(suppliesTable.id, targetId),
            eq(suppliesTable.variantOfId, sourceId),
          ),
        );
      // Mueve las traducciones de nombre de A a B: el canónico (B) gana en
      // conflicto de locale (ON CONFLICT DO NOTHING), y las de A se borran para
      // no dejar i18n huérfana en un insumo archivado. Así el nombre queda
      // enriquecido en todos los idiomas que aportaba el duplicado.
      await tx.execute(sql`
        INSERT INTO supply_translations (supply_id, locale, name)
        SELECT ${targetId}, locale, name
        FROM supply_translations
        WHERE supply_id = ${sourceId}
        ON CONFLICT (supply_id, locale) DO NOTHING
      `);
      await tx
        .delete(supplyTranslationsTable)
        .where(eq(supplyTranslationsTable.supplyId, sourceId));
      // Archiva A (no se borra: preserva referencias legadas para #223/#226).
      await tx
        .update(suppliesTable)
        .set({ status: 'archived', updatedAt: new Date() })
        .where(eq(suppliesTable.id, sourceId));
    });
  }

  private toSupply(row: SupplyRow): Supply {
    return Supply.fromSnapshot({
      id: row.id,
      code: row.code,
      name: row.name,
      categorySlug: row.categorySlug,
      defaultUnit: row.defaultUnit ?? null,
      attributes: (row.attributes ?? {}) as Record<string, unknown>,
      variantOfId: row.variantOfId ?? null,
      status: row.status as SupplyStatus,
      registrationNotes: row.registrationNotes ?? null,
      scopeId: row.scopeId ?? null,
    });
  }

  /**
   * Visibilidad por scope (#397): sin scope, sólo globales (`scope_id IS NULL`);
   * con un tenant, global ∪ tenant (nunca otros tenants). El default global
   * preserva el comportamiento actual (los hosts HTTP operan en global).
   */
  private supplyVisibility(
    scopeId: string | null | undefined,
  ): SQL | undefined {
    return scopeId === null || scopeId === undefined
      ? isNull(suppliesTable.scopeId)
      : or(isNull(suppliesTable.scopeId), eq(suppliesTable.scopeId, scopeId));
  }

  private aliasVisibility(scopeId: string | null | undefined): SQL | undefined {
    return scopeId === null || scopeId === undefined
      ? isNull(supplyAliasesTable.scopeId)
      : or(
          isNull(supplyAliasesTable.scopeId),
          eq(supplyAliasesTable.scopeId, scopeId),
        );
  }
}
