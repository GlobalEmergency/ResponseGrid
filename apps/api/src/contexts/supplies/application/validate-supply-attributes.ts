import {
  AttributeDefinitionRepository,
  resolveEffectiveSchema,
  validateAttributes,
} from '@globalemergency/warehouse-core/catalog';
import { CategoryRegistry } from '@globalemergency/warehouse-core/kernel';

/**
 * Valida (y normaliza) los `attributes` de un insumo contra el **esquema
 * efectivo** de su familia — la unión de definiciones de la ascendencia de su
 * categoría (`resolveEffectiveSchema`). Fuente única del flujo de validación
 * compartida por el alta (`CreateSupply`) y la edición (`EditSupply`).
 *
 * Tenencia (#397): con `scopeId` de tenant el repo devuelve global ∪ tenant y
 * `resolveEffectiveSchema` fusiona ese conjunto por scope; sin scope (`null`),
 * sólo globales. Si la familia no tiene definiciones, el esquema es vacío y los
 * atributos pasan tal cual (catálogo libre).
 */
export async function validateSupplyAttributes(
  attributeRepo: AttributeDefinitionRepository,
  categorySlug: string,
  attributes: Record<string, unknown>,
  categories: readonly { slug: string; parentSlug: string | null }[],
  scopeId: string | null,
): Promise<Record<string, unknown>> {
  const registry = CategoryRegistry.fromNodes(
    categories.map((c) => ({
      slug: c.slug,
      parentSlug: c.parentSlug,
      codePrefix: null,
    })),
  );
  const ancestrySlugs = [
    categorySlug,
    ...registry.ancestorsOf(categorySlug).map((n) => n.slug),
  ];
  const defs = await attributeRepo.findByCategoryAncestry(
    ancestrySlugs,
    scopeId,
  );
  const schema = resolveEffectiveSchema(categorySlug, defs, registry, scopeId);
  return validateAttributes(attributes, schema);
}
