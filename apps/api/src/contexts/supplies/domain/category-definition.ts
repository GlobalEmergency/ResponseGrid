/**
 * CategoryDefinition — the rich, data-driven description of a category: its
 * canonical slug plus localized labels, hierarchy (parentSlug), vertical and
 * sort order. Backed by the `categories` table. The slug is a plain string so
 * the schema can carry both core categories and finer subcategories.
 *
 * Es la proyección PÚBLICA de la taxonomía (la que sirve `GET /categories`):
 * solo campos publicables. NO debe crecer con datos de gestión interna (notas,
 * flag de desactivación, etc.); esos quedan para la API interna.
 */
export interface CategoryTranslation {
  locale: string;
  label: string;
}

export interface CategoryDefinition {
  slug: string;
  labelEs: string;
  labelEn: string;
  parentSlug: string | null;
  vertical: string;
  sort: number;
  archivedAt: Date | null;
  translations: readonly CategoryTranslation[];
}
