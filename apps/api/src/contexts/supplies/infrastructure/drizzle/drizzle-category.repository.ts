import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { CategoryDefinition } from '../../domain/category-definition';
import {
  CategoryListOptions,
  CategoryRepository,
  CategoryTranslationInput,
  CategoryWriteInput,
} from '../../domain/ports/category.repository';
import { Db } from '../../../../shared/db';
import {
  categoriesTable,
  categoryAliasesTable,
  categoryTranslationsTable,
} from './schema';

type CategoryTranslationRow = typeof categoryTranslationsTable.$inferSelect;

export class DrizzleCategoryRepository implements CategoryRepository {
  constructor(private readonly db: Db) {}

  async loadAliasMap(): Promise<Map<string, string>> {
    const rows = await this.db.select().from(categoryAliasesTable);
    return new Map(rows.map((r) => [r.aliasNorm, r.categorySlug]));
  }

  async listCategories(
    options: CategoryListOptions = {},
  ): Promise<CategoryDefinition[]> {
    const filters = [];
    if (options.includeArchived !== true) {
      filters.push(isNull(categoriesTable.archivedAt));
    }

    const categoryRows = await this.db
      .select()
      .from(categoriesTable)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(asc(categoriesTable.sort), asc(categoriesTable.slug));

    if (categoryRows.length === 0) {
      return [];
    }

    const translationRows = await this.db
      .select()
      .from(categoryTranslationsTable)
      .where(
        inArray(
          categoryTranslationsTable.categorySlug,
          categoryRows.map((row) => row.slug),
        ),
      );

    const translationsBySlug = new Map<
      string,
      Array<{ locale: string; label: string }>
    >();
    for (const row of translationRows) {
      const list = translationsBySlug.get(row.categorySlug) ?? [];
      list.push({ locale: row.locale, label: row.label });
      translationsBySlug.set(row.categorySlug, list);
    }

    return categoryRows.map((row) => ({
      slug: row.slug,
      labelEs: row.labelEs,
      labelEn: row.labelEn,
      parentSlug: row.parentSlug ?? null,
      vertical: row.vertical,
      sort: row.sort,
      archivedAt: row.archivedAt ?? null,
      translations: (translationsBySlug.get(row.slug) ?? []).sort((a, b) =>
        a.locale.localeCompare(b.locale),
      ),
    }));
  }

  async findBySlug(
    slug: string,
    options: CategoryListOptions = {},
  ): Promise<CategoryDefinition | null> {
    const filters = [eq(categoriesTable.slug, slug)];
    if (options.includeArchived !== true) {
      filters.push(isNull(categoriesTable.archivedAt));
    }

    const categoryRows = await this.db
      .select()
      .from(categoriesTable)
      .where(and(...filters));

    const row = categoryRows[0];
    if (!row) {
      return null;
    }

    const translationRows = await this.db
      .select()
      .from(categoryTranslationsTable)
      .where(eq(categoryTranslationsTable.categorySlug, slug));

    const translations = translationRows
      .map((r) => ({ locale: r.locale, label: r.label }))
      .sort((a, b) => a.locale.localeCompare(b.locale));

    return {
      slug: row.slug,
      labelEs: row.labelEs,
      labelEn: row.labelEn,
      parentSlug: row.parentSlug ?? null,
      vertical: row.vertical,
      sort: row.sort,
      archivedAt: row.archivedAt ?? null,
      translations,
    };
  }

  async createCategory(input: CategoryWriteInput): Promise<CategoryDefinition> {
    const slug = input.slug.trim();

    await this.db.transaction(async (tx) => {
      await tx.insert(categoriesTable).values({
        slug,
        labelEs: input.labelEs,
        labelEn: input.labelEn,
        parentSlug: input.parentSlug,
        vertical: input.vertical,
        sort: input.sort,
        archivedAt: input.archivedAt ?? null,
      });

      const translations = this.buildTranslationRows(
        slug,
        input.labelEs,
        input.labelEn,
        input.translations,
      );
      if (translations.length > 0) {
        await tx.insert(categoryTranslationsTable).values(translations);
      }
    });

    const created = await this.findBySlug(slug, { includeArchived: true });
    if (!created) {
      throw new Error(`Failed to reload category after creation: ${slug}`);
    }
    return created;
  }

  async updateCategory(
    slug: string,
    input: CategoryWriteInput,
  ): Promise<CategoryDefinition> {
    const nextSlug = input.slug.trim();

    await this.db.transaction(async (tx) => {
      await tx
        .update(categoriesTable)
        .set({
          slug: nextSlug,
          labelEs: input.labelEs,
          labelEn: input.labelEn,
          parentSlug: input.parentSlug,
          vertical: input.vertical,
          sort: input.sort,
          archivedAt: input.archivedAt ?? null,
        })
        .where(eq(categoriesTable.slug, slug));

      await tx
        .delete(categoryTranslationsTable)
        .where(eq(categoryTranslationsTable.categorySlug, nextSlug));

      const translations = this.buildTranslationRows(
        nextSlug,
        input.labelEs,
        input.labelEn,
        input.translations,
      );
      if (translations.length > 0) {
        await tx.insert(categoryTranslationsTable).values(translations);
      }
    });

    const updated = await this.findBySlug(nextSlug, { includeArchived: true });
    if (!updated) {
      throw new Error(`Failed to reload category after update: ${nextSlug}`);
    }
    return updated;
  }

  private buildTranslationRows(
    slug: string,
    labelEs: string,
    labelEn: string,
    translations?: readonly CategoryTranslationInput[],
  ): CategoryTranslationRow[] {
    const entries = new Map<string, string>();
    entries.set('es', labelEs.trim());
    entries.set('en', labelEn.trim());
    for (const translation of translations ?? []) {
      const locale = translation.locale.trim().toLowerCase();
      const label = translation.label.trim();
      if (!locale || !label) {
        continue;
      }
      entries.set(locale, label);
    }
    return [...entries.entries()].map(([locale, label]) => ({
      categorySlug: slug,
      locale,
      label,
    }));
  }
}
