import { asc, isNull } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { categoriesTable, categoryAliasesTable } from './schema';
import { CategoryRepository } from '../../domain/ports/category.repository';
import { CategoryDefinition } from '../../domain/category-definition';
import { loadTranslationsBySlug } from './category-translations.query';

export class DrizzleCategoryRepository implements CategoryRepository {
  constructor(private readonly db: Db) {}

  async loadAliasMap(): Promise<Map<string, string>> {
    const rows = await this.db.select().from(categoryAliasesTable);
    return new Map(rows.map((r) => [r.aliasNorm, r.categorySlug]));
  }

  async listCategories(): Promise<CategoryDefinition[]> {
    // Proyección PÚBLICA de la taxonomía: allow-list explícito de columnas. NO
    // hacemos `select()` de toda la fila para que campos internos (p.ej.
    // `archived_at`, notas de gestión) no se traigan ni se filtren por
    // accidente. Las categorías archivadas se excluyen aquí.
    const rows = await this.db
      .select({
        slug: categoriesTable.slug,
        labelEs: categoriesTable.labelEs,
        labelEn: categoriesTable.labelEn,
        parentSlug: categoriesTable.parentSlug,
        vertical: categoriesTable.vertical,
        sort: categoriesTable.sort,
      })
      .from(categoriesTable)
      .where(isNull(categoriesTable.archivedAt))
      .orderBy(asc(categoriesTable.sort));

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
      translations: translations.get(r.slug) ?? [],
    }));
  }
}
