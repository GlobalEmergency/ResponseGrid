/**
 * Category colour metadata for resource `accepts` slugs.
 *
 * Used by `ResourceCard` (and similar chips) to render consistent colours.
 * Labels now come from the DB-sourced catalogue (`getCategoriesCached` +
 * `labelForCategory` in `@/domain/supplies/category`) — this module only
 * keeps the presentation-only colour mapping. Add new slugs here if the
 * backend introduces them — `categoryColor` falls back gracefully to `other`
 * when a slug is unknown.
 */

export interface CategoryMeta {
  /** Tailwind utility classes for the chip background + text colour */
  color: string;
}

const CATEGORY_MAP: Record<string, CategoryMeta> = {
  water: {
    color: 'bg-blue-100 text-blue-800',
  },
  food: {
    color: 'bg-orange-100 text-orange-800',
  },
  clothing: {
    color: 'bg-purple-100 text-purple-800',
  },
  hygiene: {
    color: 'bg-teal-100 text-teal-800',
  },
  medical: {
    color: 'bg-red-100 text-red-800',
  },
  shelter: {
    color: 'bg-yellow-100 text-yellow-800',
  },
  tools: {
    color: 'bg-gray-200 text-gray-800',
  },
  medicines: {
    color: 'bg-rose-100 text-rose-800',
  },
  medical_equipment: {
    color: 'bg-pink-100 text-pink-800',
  },
  medical_supplies: {
    color: 'bg-indigo-100 text-indigo-800',
  },
  medical_personnel: {
    color: 'bg-emerald-100 text-emerald-800',
  },
  other: {
    color: 'bg-gray-100 text-gray-700',
  },
};

const FALLBACK: CategoryMeta = CATEGORY_MAP['other']!;

/**
 * Returns a Tailwind class string for the chip colour of a category slug.
 * Falls back to the `other` colour if the slug is unknown.
 */
export function categoryColor(slug: string): string {
  return (CATEGORY_MAP[slug] ?? FALLBACK).color;
}
