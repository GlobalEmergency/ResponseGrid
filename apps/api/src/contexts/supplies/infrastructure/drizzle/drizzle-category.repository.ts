import { asc } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { categoriesTable, categoryAliasesTable } from './schema';
import { CategoryRepository } from '../../domain/ports/category.repository';
import { CategoryDefinition } from '../../domain/category-definition';

export class DrizzleCategoryRepository implements CategoryRepository {
  constructor(private readonly db: Db) {}

  async loadAliasMap(): Promise<Map<string, string>> {
    const rows = await this.db.select().from(categoryAliasesTable);
    return new Map(rows.map((r) => [r.aliasNorm, r.categorySlug]));
  }

  async listCategories(): Promise<CategoryDefinition[]> {
    // Proyección PÚBLICA de la taxonomía: allow-list explícito de columnas. NO
    // hacemos `select()` de toda la fila para que campos internos que se añadan
    // a `categories` en el futuro (p.ej. notas de gestión o un flag de
    // desactivación) no se traigan ni se filtren por accidente. Cuando exista
    // un estado de categoría, las desactivadas se excluyen aquí (`.where(...)`).
    const rows = await this.db
      .select({
        slug: categoriesTable.slug,
        labelEs: categoriesTable.labelEs,
        labelEn: categoriesTable.labelEn,
        parentSlug: categoriesTable.parentSlug,
        vertical: categoriesTable.vertical,
        sort: categoriesTable.sort,
        codePrefix: categoriesTable.codePrefix,
      })
      .from(categoriesTable)
      .orderBy(asc(categoriesTable.sort));
    return rows.map((r) => ({
      slug: r.slug,
      labelEs: r.labelEs,
      labelEn: r.labelEn,
      parentSlug: r.parentSlug ?? null,
      vertical: r.vertical,
      sort: r.sort,
      codePrefix: r.codePrefix ?? null,
    }));
  }
}
