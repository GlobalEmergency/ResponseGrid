/**
 * Category metadata for resource `accepts` slugs.
 *
 * Used by `ResourceCard` to render compact chips with consistent colours.
 * Add new slugs here if the backend introduces them — the helper functions
 * fall back gracefully to `other` when a slug is unknown.
 */

export interface CategoryMeta {
  labelEs: string;
  labelEn: string;
  /** Tailwind utility classes for the chip background + text colour */
  color: string;
}

const CATEGORY_MAP: Record<string, CategoryMeta> = {
  water: {
    labelEs: 'Agua',
    labelEn: 'Water',
    color: 'bg-blue-100 text-blue-800',
  },
  food: {
    labelEs: 'Alimentos',
    labelEn: 'Food',
    color: 'bg-orange-100 text-orange-800',
  },
  clothing: {
    labelEs: 'Ropa',
    labelEn: 'Clothing',
    color: 'bg-purple-100 text-purple-800',
  },
  hygiene: {
    labelEs: 'Higiene',
    labelEn: 'Hygiene',
    color: 'bg-teal-100 text-teal-800',
  },
  medical: {
    labelEs: 'Sanitario',
    labelEn: 'Medical',
    color: 'bg-red-100 text-red-800',
  },
  shelter: {
    labelEs: 'Refugio',
    labelEn: 'Shelter',
    color: 'bg-yellow-100 text-yellow-800',
  },
  tools: {
    labelEs: 'Herramientas',
    labelEn: 'Tools',
    color: 'bg-gray-200 text-gray-800',
  },
  medicines: {
    labelEs: 'Medicamentos',
    labelEn: 'Medicines',
    color: 'bg-rose-100 text-rose-800',
  },
  medical_equipment: {
    labelEs: 'Equipos médicos',
    labelEn: 'Medical equipment',
    color: 'bg-pink-100 text-pink-800',
  },
  medical_supplies: {
    labelEs: 'Insumos médicos',
    labelEn: 'Medical supplies',
    color: 'bg-indigo-100 text-indigo-800',
  },
  medical_personnel: {
    labelEs: 'Personal sanitario',
    labelEn: 'Medical personnel',
    color: 'bg-emerald-100 text-emerald-800',
  },
  other: {
    labelEs: 'Otro',
    labelEn: 'Other',
    color: 'bg-gray-100 text-gray-700',
  },
};

const FALLBACK: CategoryMeta = CATEGORY_MAP['other']!;

/**
 * Ordered list of ALL category slugs — the single source mirroring the
 * canonical `Category` taxonomy of the API's supplies context. Used by pickers
 * that may reference any category, including needs (which can request
 * `medical_personnel`).
 */
export const ALL_CATEGORIES = [
  'food',
  'water',
  'hygiene',
  'clothing',
  'shelter',
  'medical',
  'medicines',
  'medical_equipment',
  'medical_supplies',
  'medical_personnel',
  'tools',
  'other',
] as const;

/**
 * Ordered list of MATERIAL category slugs for supply pickers (offers,
 * inventory). Same as {@link ALL_CATEGORIES} but excludes `medical_personnel`
 * (personnel, not material).
 */
export const MATERIAL_CATEGORIES = [
  'food',
  'water',
  'hygiene',
  'clothing',
  'shelter',
  'medical',
  'medicines',
  'medical_equipment',
  'medical_supplies',
  'tools',
  'other',
] as const;

/**
 * Returns the human-readable label for a category slug in the given locale.
 * Falls back to the slug itself if the slug is unknown (so a new API category
 * surfaces visibly as its slug rather than being silently mislabelled "Other").
 */
export function categoryLabel(slug: string, locale: 'es' | 'en'): string {
  const meta = CATEGORY_MAP[slug];
  if (!meta) return slug;
  return locale === 'en' ? meta.labelEn : meta.labelEs;
}

/**
 * Returns a Tailwind class string for the chip colour of a category slug.
 * Falls back to the `other` colour if the slug is unknown.
 */
export function categoryColor(slug: string): string {
  return (CATEGORY_MAP[slug] ?? FALLBACK).color;
}
