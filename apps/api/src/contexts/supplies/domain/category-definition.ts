import { Category } from './category';

/**
 * CategoryDefinition — the rich, data-driven description of a category: its
 * canonical slug plus localized labels, hierarchy (parentSlug), vertical and
 * sort order. Backed by the `categories` table. The slug corresponds to a
 * {@link Category} value; this record enriches it for the UI and facets.
 */
export interface CategoryDefinition {
  slug: Category;
  labelEs: string;
  labelEn: string;
  parentSlug: Category | null;
  vertical: string;
  sort: number;
}
