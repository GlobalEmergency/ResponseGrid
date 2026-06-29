import { asc, eq } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import {
  categoryTranslationsTable,
  categoriesTable,
  supplyAliasesTable,
  supplyTranslationsTable,
  suppliesTable,
} from './schema';
import {
  SupplyCatalogRecord,
  SupplyRepository,
} from '../../domain/ports/supply.repository';
import { SupplyStatus } from '../../domain/supply';

export class DrizzleSupplyRepository implements SupplyRepository {
  constructor(private readonly db: Db) {}

  async loadCatalog(): Promise<SupplyCatalogRecord[]> {
    const [
      supplyRows,
      aliasRows,
      supplyTranslationRows,
      categoryRows,
      categoryTranslationRows,
    ] = await Promise.all([
      this.db.select().from(suppliesTable).orderBy(asc(suppliesTable.name)),
      this.db.select().from(supplyAliasesTable),
      this.db
        .select()
        .from(supplyTranslationsTable)
        .where(eq(supplyTranslationsTable.locale, 'en')),
      this.db.select().from(categoriesTable),
      this.db
        .select()
        .from(categoryTranslationsTable)
        .where(eq(categoryTranslationsTable.locale, 'en')),
    ]);

    const aliasesBySupplyId = new Map<string, string[]>();
    for (const row of aliasRows) {
      const aliases = aliasesBySupplyId.get(row.supplyId) ?? [];
      aliases.push(row.aliasNorm);
      aliasesBySupplyId.set(row.supplyId, aliases);
    }

    const supplyNameEnById = new Map(
      supplyTranslationRows.map((row) => [row.supplyId, row.name]),
    );
    const categoryBySlug = new Map(categoryRows.map((row) => [row.slug, row]));
    const categoryLabelEnBySlug = new Map(
      categoryTranslationRows.map((row) => [row.categorySlug, row.label]),
    );

    return supplyRows.map((row) => {
      const category = categoryBySlug.get(row.categorySlug);
      return {
        id: row.id,
        code: row.code,
        nameEs: row.name,
        nameEn: supplyNameEnById.get(row.id) ?? null,
        categorySlug: row.categorySlug,
        categoryLabelEs: category?.labelEs ?? row.categorySlug,
        categoryLabelEn:
          categoryLabelEnBySlug.get(row.categorySlug) ??
          category?.labelEn ??
          row.categorySlug,
        defaultUnit: row.defaultUnit ?? null,
        attributes: (row.attributes ?? {}) as Record<string, unknown>,
        variantOfId: row.variantOfId ?? null,
        status: row.status as SupplyStatus,
        registrationNotes: row.registrationNotes ?? null,
        aliases: aliasesBySupplyId.get(row.id) ?? [],
      };
    });
  }
}
