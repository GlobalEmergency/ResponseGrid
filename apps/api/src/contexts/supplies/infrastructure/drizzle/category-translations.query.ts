import { inArray } from 'drizzle-orm';
import { Db } from '../../../../shared/db';
import { CategoryTranslation } from '../../domain/category-definition';
import { categoryTranslationsTable } from './schema';

/**
 * Carga las traducciones (idiomas adicionales a es/en) de un conjunto de
 * categorías, agrupadas por slug y ordenadas por locale. Compartido por el
 * repo público (localización del `label`) y el admin (evita duplicar el join).
 */
export async function loadTranslationsBySlug(
  db: Db,
  slugs: readonly string[],
): Promise<Map<string, CategoryTranslation[]>> {
  const map = new Map<string, CategoryTranslation[]>();
  if (slugs.length === 0) {
    return map;
  }
  const rows = await db
    .select({
      categorySlug: categoryTranslationsTable.categorySlug,
      locale: categoryTranslationsTable.locale,
      label: categoryTranslationsTable.label,
    })
    .from(categoryTranslationsTable)
    .where(inArray(categoryTranslationsTable.categorySlug, [...slugs]));

  for (const row of rows) {
    const bucket = map.get(row.categorySlug) ?? [];
    bucket.push({ locale: row.locale, label: row.label });
    map.set(row.categorySlug, bucket);
  }
  for (const bucket of map.values()) {
    bucket.sort((a, b) => a.locale.localeCompare(b.locale));
  }
  return map;
}
