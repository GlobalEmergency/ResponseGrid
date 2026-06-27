import { asc } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { categoriesTable, categoryAliasesTable } from './schema';
import { CategoryRepository } from '../../domain/ports/category.repository';
import { Category } from '../../domain/category';

export class DrizzleCategoryRepository implements CategoryRepository {
  constructor(private readonly db: Db) {}

  async loadAliasMap(): Promise<Map<string, string>> {
    const rows = await this.db.select().from(categoryAliasesTable);
    return new Map(rows.map((r) => [r.aliasNorm, r.categorySlug]));
  }

  async listCategories(): Promise<Category[]> {
    const rows = await this.db
      .select()
      .from(categoriesTable)
      .orderBy(asc(categoriesTable.sort));
    return rows.map((r) => ({
      slug: r.slug,
      labelEs: r.labelEs,
      labelEn: r.labelEn,
      parentSlug: r.parentSlug ?? null,
      vertical: r.vertical,
      sort: r.sort,
    }));
  }
}
