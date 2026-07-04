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
}

const CORE_CATEGORY_SLUGS: ReadonlySet<string> = new Set(
  Object.values(Category),
);

/**
 * ¿Es un slug núcleo? Los slugs del enum son la fuente de verdad a nivel de
 * código y los referencian otras tablas/contextos, por lo que la gestión de
 * catálogo (#221) los protege: no se pueden borrar ni renombrar. Regla de
 * dominio consumida por los casos de uso (no repetida en el controller).
 */
export function isCoreCategory(slug: string): boolean {
  return CORE_CATEGORY_SLUGS.has(slug);
}
