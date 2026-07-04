import { asc, eq, isNull } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { CategoryRecord } from '../../domain/category-record';
import {
  CategoryAdminRepository,
  CategoryWriteInput,
} from '../../domain/ports/category-admin.repository';
import { categoriesTable, categoryTranslationsTable } from './schema';
import { loadTranslationsBySlug } from './category-translations.query';

type CategoryRow = typeof categoriesTable.$inferSelect;

/**
 * Adaptador de la API interna/admin del catálogo. Persistencia "tonta": las
 * invariantes de negocio (existe, padre válido, slug núcleo protegido) las
 * garantizan los casos de uso; aquí solo se lee/escribe. es/en viven en
 * label_es/label_en; category_translations guarda solo idiomas adicionales.
 */
export class DrizzleCategoryAdminRepository implements CategoryAdminRepository {
  constructor(private readonly db: Db) {}

  async list(
    options: { includeArchived?: boolean } = {},
  ): Promise<CategoryRecord[]> {
    const base = this.db.select().from(categoriesTable);
    const rows = await (options.includeArchived
      ? base.orderBy(asc(categoriesTable.sort), asc(categoriesTable.slug))
      : base
          .where(isNull(categoriesTable.archivedAt))
          .orderBy(asc(categoriesTable.sort), asc(categoriesTable.slug)));
    return this.hydrate(rows);
  }

  async findBySlug(slug: string): Promise<CategoryRecord | null> {
    const rows = await this.db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.slug, slug));
    return (await this.hydrate(rows))[0] ?? null;
  }

  async create(input: CategoryWriteInput): Promise<CategoryRecord> {
    await this.db.transaction(async (tx) => {
      await tx.insert(categoriesTable).values({
        slug: input.slug,
        labelEs: input.labelEs,
        labelEn: input.labelEn,
        parentSlug: input.parentSlug,
        vertical: input.vertical,
        sort: input.sort,
        archivedAt: input.archivedAt,
      });
      const translations = this.extraTranslationRows(input);
      if (translations.length > 0) {
        await tx.insert(categoryTranslationsTable).values(translations);
      }
    });
    return this.mustFind(input.slug);
  }

  async update(
    slug: string,
    input: CategoryWriteInput,
  ): Promise<CategoryRecord> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(categoriesTable)
        .set({
          labelEs: input.labelEs,
          labelEn: input.labelEn,
          parentSlug: input.parentSlug,
          vertical: input.vertical,
          sort: input.sort,
          archivedAt: input.archivedAt,
        })
        .where(eq(categoriesTable.slug, slug));

      await tx
        .delete(categoryTranslationsTable)
        .where(eq(categoryTranslationsTable.categorySlug, slug));
      const translations = this.extraTranslationRows({ ...input, slug });
      if (translations.length > 0) {
        await tx.insert(categoryTranslationsTable).values(translations);
      }
    });
    return this.mustFind(slug);
  }

  /** Filas de category_translations: solo idiomas ≠ es/en, sin vacíos, dedup. */
  private extraTranslationRows(
    input: CategoryWriteInput,
  ): Array<{ categorySlug: string; locale: string; label: string }> {
    const byLocale = new Map<string, string>();
    for (const translation of input.translations) {
      const locale = translation.locale.trim().toLowerCase();
      const label = translation.label.trim();
      if (locale === '' || label === '' || locale === 'es' || locale === 'en') {
        continue;
      }
      byLocale.set(locale, label);
    }
    return [...byLocale.entries()].map(([locale, label]) => ({
      categorySlug: input.slug,
      locale,
      label,
    }));
  }

  private async mustFind(slug: string): Promise<CategoryRecord> {
    const record = await this.findBySlug(slug);
    if (!record) {
      throw new Error(`Category not reloadable after write: ${slug}`);
    }
    return record;
  }

  private async hydrate(rows: CategoryRow[]): Promise<CategoryRecord[]> {
    if (rows.length === 0) {
      return [];
    }
    const translations = await loadTranslationsBySlug(
      this.db,
      rows.map((r) => r.slug),
    );
    return rows.map((r) => ({
      slug: r.slug,
      labelEs: r.labelEs,
      labelEn: r.labelEn,
      parentSlug: r.parentSlug ?? null,
      vertical: r.vertical,
      sort: r.sort,
      archivedAt: r.archivedAt ?? null,
      translations: translations.get(r.slug) ?? [],
    }));
  }
}
