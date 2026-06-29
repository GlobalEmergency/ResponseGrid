import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { CategoryDefinition } from '../../domain/category-definition';
import {
  CategoryAlreadyExistsError,
  CategoryNotFoundError,
  CategoryParentNotFoundError,
  CategoryValidationError,
} from '../../application/category-admin.errors';
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

type CategoryRow = typeof categoriesTable.$inferSelect;
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
    const rows = await this.selectCategoryRows(
      options.includeArchived === true,
    );
    return this.hydrateCategories(rows);
  }

  async findBySlug(
    slug: string,
    options: CategoryListOptions = {},
  ): Promise<CategoryDefinition | null> {
    const rows = await this.selectCategoryRows(
      options.includeArchived === true,
      slug,
    );
    return this.hydrateCategories(rows)[0] ?? null;
  }

  async createCategory(input: CategoryWriteInput): Promise<void> {
    const slug = input.slug.trim();
    if (slug === '') {
      throw new CategoryValidationError('Category slug is required');
    }
    if (await this.findBySlug(slug, { includeArchived: true })) {
      throw new CategoryAlreadyExistsError(slug);
    }
    await this.ensureValidParent(input.parentSlug, slug);

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
  }

  async updateCategory(slug: string, input: CategoryWriteInput): Promise<void> {
    const current = await this.findBySlug(slug, { includeArchived: true });
    if (!current) {
      throw new CategoryNotFoundError(slug);
    }

    const nextSlug = input.slug.trim();
    if (nextSlug === '') {
      throw new CategoryValidationError('Category slug is required');
    }
    if (current.slug !== nextSlug) {
      throw new CategoryValidationError('Category slug cannot be changed');
    }

    await this.ensureValidParent(input.parentSlug, nextSlug);

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
          archivedAt: input.archivedAt ?? current.archivedAt,
        })
        .where(eq(categoriesTable.slug, current.slug));

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
  }

  private async ensureValidParent(
    parentSlug: string | null,
    currentSlug: string,
  ): Promise<void> {
    if (parentSlug === null) {
      return;
    }
    if (parentSlug === currentSlug) {
      throw new CategoryValidationError('A category cannot be its own parent');
    }
    const parent = await this.findBySlug(parentSlug, {
      includeArchived: false,
    });
    if (!parent) {
      throw new CategoryParentNotFoundError(parentSlug);
    }
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

  private async selectCategoryRows(
    includeArchived: boolean,
    slug?: string,
  ): Promise<
    Array<{
      category: CategoryRow;
      translation: CategoryTranslationRow | null;
    }>
  > {
    const filters = [
      slug !== undefined ? eq(categoriesTable.slug, slug) : undefined,
    ];
    if (!includeArchived) {
      filters.push(isNull(categoriesTable.archivedAt));
    }

    const where = filters.filter(
      (f): f is NonNullable<typeof f> => f !== undefined,
    );
    const categoryRows =
      where.length > 0
        ? await this.db
            .select()
            .from(categoriesTable)
            .where(and(...where))
            .orderBy(asc(categoriesTable.sort), asc(categoriesTable.slug))
        : await this.db
            .select()
            .from(categoriesTable)
            .orderBy(asc(categoriesTable.sort), asc(categoriesTable.slug));

    if (categoryRows.length === 0) {
      return [];
    }

    const translations = await this.db
      .select()
      .from(categoryTranslationsTable)
      .where(
          inArray(
            categoryTranslationsTable.categorySlug,
            categoryRows.map((row) => row.slug),
          ),
      );

    const translationMap = new Map<string, CategoryTranslationRow[]>();
    for (const translation of translations) {
      const bucket = translationMap.get(translation.categorySlug) ?? [];
      bucket.push(translation);
      translationMap.set(translation.categorySlug, bucket);
    }

    return categoryRows.flatMap((category) =>
      (translationMap.get(category.slug) ?? [null]).map((translation) => ({
        category,
        translation,
      })),
    );
  }

  private hydrateCategories(
    rows: Array<{
      category: CategoryRow;
      translation: CategoryTranslationRow | null;
    }>,
  ): CategoryDefinition[] {
    const grouped = new Map<string, CategoryDefinition>();

    for (const row of rows) {
      const current = grouped.get(row.category.slug) ?? {
        slug: row.category.slug,
        labelEs: row.category.labelEs,
        labelEn: row.category.labelEn,
        parentSlug: row.category.parentSlug ?? null,
        vertical: row.category.vertical,
        sort: row.category.sort,
        archivedAt: row.category.archivedAt ?? null,
        translations: [],
      };

      if (row.translation) {
        current.translations = [
          ...current.translations,
          {
            locale: row.translation.locale,
            label: row.translation.label,
          },
        ];
      }
      grouped.set(row.category.slug, current);
    }

    return [...grouped.values()].map((category) => ({
      ...category,
      translations: [...category.translations].sort((a, b) =>
        a.locale.localeCompare(b.locale),
      ),
    }));
  }
}
