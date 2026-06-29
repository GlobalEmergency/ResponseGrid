/**
 * CategoryDefinition — the rich, data-driven description of a category: its
 * canonical slug plus localized labels, hierarchy (parentSlug), vertical and
 * sort order. Backed by the `categories` table. The slug is a plain string so
 * the schema can carry both core categories and finer subcategories.
 */
export interface CategoryDefinition {
  slug: string;
  labelEs: string;
  labelEn: string;
  parentSlug: string | null;
  vertical: string;
  sort: number;
}
