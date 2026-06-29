import { and, asc, eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import {
  PublicSupplyRecord,
  SupplyCatalogReadModel,
} from '../../domain/ports/supply-catalog.read-model';
import {
  categoryTranslationsTable,
  categoriesTable,
  supplyAliasesTable,
  supplyTranslationsTable,
  suppliesTable,
} from './schema';

const ACTIVE = 'active';
const EN = 'en';

type SupplyRow = typeof suppliesTable.$inferSelect;
type CategoryRow = typeof categoriesTable.$inferSelect;

/**
 * Lectura del catálogo público. Solo materializa insumos `active` y proyecta
 * exclusivamente campos publicables (sin `status` ni `registrationNotes`).
 */
export class DrizzleSupplyCatalogReadModel implements SupplyCatalogReadModel {
  constructor(private readonly db: Db) {}

  async listActive(): Promise<PublicSupplyRecord[]> {
    const [
      supplyRows,
      aliasRows,
      supplyTranslationRows,
      categoryRows,
      categoryTranslationRows,
    ] = await Promise.all([
      this.db
        .select()
        .from(suppliesTable)
        .where(eq(suppliesTable.status, ACTIVE))
        .orderBy(asc(suppliesTable.name)),
      this.db.select().from(supplyAliasesTable),
      this.db
        .select()
        .from(supplyTranslationsTable)
        .where(eq(supplyTranslationsTable.locale, EN)),
      this.db.select().from(categoriesTable),
      this.db
        .select()
        .from(categoryTranslationsTable)
        .where(eq(categoryTranslationsTable.locale, EN)),
    ]);

    const aliasesBySupplyId = new Map<string, string[]>();
    for (const row of aliasRows) {
      const aliases = aliasesBySupplyId.get(row.supplyId) ?? [];
      aliases.push(row.aliasNorm);
      aliasesBySupplyId.set(row.supplyId, aliases);
    }

    const nameEnBySupplyId = new Map(
      supplyTranslationRows.map((row) => [row.supplyId, row.name]),
    );
    const categoryBySlug = new Map(categoryRows.map((row) => [row.slug, row]));
    const categoryLabelEnBySlug = new Map(
      categoryTranslationRows.map((row) => [row.categorySlug, row.label]),
    );

    return supplyRows.map((row) =>
      this.toRecord(
        row,
        nameEnBySupplyId.get(row.id) ?? null,
        categoryBySlug.get(row.categorySlug),
        categoryLabelEnBySlug.get(row.categorySlug) ?? null,
        aliasesBySupplyId.get(row.id) ?? [],
      ),
    );
  }

  async findActiveById(id: string): Promise<PublicSupplyRecord | null> {
    const [row] = await this.db
      .select()
      .from(suppliesTable)
      .where(and(eq(suppliesTable.id, id), eq(suppliesTable.status, ACTIVE)))
      .limit(1);
    if (!row) {
      return null;
    }

    const [nameEnRow, categoryRow, categoryLabelEnRow, aliasRows] =
      await Promise.all([
        this.db
          .select()
          .from(supplyTranslationsTable)
          .where(
            and(
              eq(supplyTranslationsTable.supplyId, id),
              eq(supplyTranslationsTable.locale, EN),
            ),
          )
          .limit(1),
        this.db
          .select()
          .from(categoriesTable)
          .where(eq(categoriesTable.slug, row.categorySlug))
          .limit(1),
        this.db
          .select()
          .from(categoryTranslationsTable)
          .where(
            and(
              eq(categoryTranslationsTable.categorySlug, row.categorySlug),
              eq(categoryTranslationsTable.locale, EN),
            ),
          )
          .limit(1),
        this.db
          .select()
          .from(supplyAliasesTable)
          .where(eq(supplyAliasesTable.supplyId, id)),
      ]);

    return this.toRecord(
      row,
      nameEnRow[0]?.name ?? null,
      categoryRow[0],
      categoryLabelEnRow[0]?.label ?? null,
      aliasRows.map((alias) => alias.aliasNorm),
    );
  }

  private toRecord(
    row: SupplyRow,
    nameEn: string | null,
    category: CategoryRow | undefined,
    categoryLabelEn: string | null,
    aliases: string[],
  ): PublicSupplyRecord {
    return {
      id: row.id,
      code: row.code,
      nameEs: row.name,
      nameEn,
      categorySlug: row.categorySlug,
      categoryLabelEs: category?.labelEs ?? row.categorySlug,
      categoryLabelEn: categoryLabelEn ?? category?.labelEn ?? null,
      defaultUnit: row.defaultUnit ?? null,
      attributes: (row.attributes ?? {}) as Record<string, unknown>,
      variantOfId: row.variantOfId ?? null,
      aliases,
    };
  }
}
