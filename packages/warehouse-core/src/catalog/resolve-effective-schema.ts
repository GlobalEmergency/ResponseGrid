import { CategoryRegistry } from '../kernel/category-registry.js';
import { AttributeDefinition } from './attribute-definition.js';
import { AttributeKeyCollisionError } from './supply-errors.js';

/**
 * resolveEffectiveSchema — servicio puro (#396). Dada una categoría y el
 * conjunto de {@link AttributeDefinition} disponibles, recorre la ascendencia
 * de la categoría en el {@link CategoryRegistry} (la propia categoría + sus
 * ancestros hasta la raíz) y devuelve el **esquema efectivo**: la unión de las
 * definiciones ancladas a cualquier nodo de esa cadena.
 *
 * La familia = un nodo de `Category` con herencia por el árbol: un `Supply` de
 * `medicines` (hija de `medical`) recibe las definiciones de `medicines` ∪
 * `medical` ∪ … hasta la raíz.
 *
 * Reglas:
 * - Sólo entran definiciones activas (no archivadas).
 * - La extensión es **aditiva, sin precedencia**: dos definiciones con la misma
 *   `key` en la cadena de ascendencia son una colisión → {@link AttributeKeyCollisionError}.
 * - Inc 1: sólo definiciones globales (`scopeId === null`). La fusión con las de
 *   tenant es Inc 2; este parámetro queda abierto para entonces.
 *
 * Orden de salida: de la raíz hacia la hoja (ancestros primero), y dentro de
 * cada nivel por `sort` y luego `key` — estable y predecible para formularios.
 */
export function resolveEffectiveSchema(
  categorySlug: string,
  allDefs: readonly AttributeDefinition[],
  registry: CategoryRegistry,
): AttributeDefinition[] {
  // Cadena de ascendencia: la propia categoría (hoja) + ancestros hacia la raíz.
  const chain = [
    categorySlug,
    ...registry.ancestorsOf(categorySlug).map((n) => n.slug),
  ];
  const chainDepth = new Map<string, number>();
  chain.forEach((slug, index) => {
    // Profundidad: 0 = raíz. La hoja está al principio del array, así que
    // invertimos el índice para que la raíz tenga la profundidad menor.
    chainDepth.set(slug, chain.length - 1 - index);
  });

  const applicable = allDefs.filter(
    (def) =>
      def.scopeId === null &&
      !def.isArchived &&
      chainDepth.has(def.categorySlug),
  );

  const byKey = new Map<string, AttributeDefinition>();
  for (const def of applicable) {
    if (byKey.has(def.key)) {
      throw new AttributeKeyCollisionError(def.key);
    }
    byKey.set(def.key, def);
  }

  return [...byKey.values()].sort((a, b) => {
    const depthA = chainDepth.get(a.categorySlug) ?? 0;
    const depthB = chainDepth.get(b.categorySlug) ?? 0;
    if (depthA !== depthB) return depthA - depthB;
    if (a.sort !== b.sort) return a.sort - b.sort;
    return a.key.localeCompare(b.key);
  });
}
