/**
 * Category — the single, canonical taxonomy of aid-material categories.
 *
 * This is the ONE definition reused across every bounded context (needs,
 * offers, resources) and surfaced in the web. It is the code-level source of
 * truth; the `categories` table ({@link CategoryDefinition}) enriches these
 * same slugs with localized labels, hierarchy, import aliases and facet counts.
 *
 * Keep the slug values in sync with the taxonomy seed
 * (drizzle/0020_taxonomy_seed.sql).
 */
export enum Category {
  Food = 'food',
  Water = 'water',
  Hygiene = 'hygiene',
  Clothing = 'clothing',
  Medical = 'medical',
  Shelter = 'shelter',
  Tools = 'tools',
  Other = 'other',
  // Health vertical (F04)
  Medicines = 'medicines',
  MedicalEquipment = 'medical_equipment',
  MedicalSupplies = 'medical_supplies',
  MedicalPersonnel = 'medical_personnel',
  // UCAB Subcategories
  FoodFresh = 'food_fresh',
  FoodNonPerishable = 'food_non_perishable',
  HygieneInfantile = 'hygiene_infantile',
  HygienePersonal = 'hygiene_personal',
  ToolsExtraction = 'tools_extraction',
  OtherPets = 'other_pets',
}

/**
 * The canonical seed of core category slugs — the values of the {@link Category}
 * enum as plain strings. The taxonomy is *open* (a `CategoryRegistry` can carry
 * finer, data-driven subcategories), but these are the ones guaranteed to exist
 * and to have code-level meaning.
 */
export const CORE_CATEGORY_SLUGS: readonly string[] = Object.values(Category);

export function isCoreCategory(slug: string): boolean {
  return Object.values(Category).includes(slug as Category);
}

export function getCategoryPrefix(
  categorySlug: string,
  categories: {
    slug: string;
    parentSlug: string | null;
    codePrefix: string | null;
  }[],
): string {
  const categoryMap = new Map(categories.map((c) => [c.slug, c]));

  let current: string | null = categorySlug;
  const visited = new Set<string>();

  while (current !== null) {
    if (visited.has(current)) {
      break;
    }
    visited.add(current);

    const cat = categoryMap.get(current);
    if (cat && cat.codePrefix) {
      return cat.codePrefix;
    }

    current = cat?.parentSlug ?? null;
  }

  return 'VAR'; // Fallback
}
