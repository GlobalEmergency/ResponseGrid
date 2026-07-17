import {
  AttributeDefinition,
  AttributeDefinitionRepository,
} from '@globalemergency/warehouse-core/catalog';

export interface ListAttributeDefinitionsQuery {
  /** Si se indica, filtra por la categoría exacta (no por ascendencia). */
  categorySlug?: string | undefined;
}

/**
 * Listado admin de definiciones de atributo (#396). Inc 1: sólo globales
 * (`scopeId === null`). Sin `categorySlug` devuelve todas; con él filtra por la
 * categoría exacta.
 */
export class ListAttributeDefinitions {
  constructor(private readonly repo: AttributeDefinitionRepository) {}

  async execute(
    query: ListAttributeDefinitionsQuery = {},
  ): Promise<AttributeDefinition[]> {
    const all = await this.repo.findByScope(null);
    if (query.categorySlug === undefined) {
      return all;
    }
    return all.filter((d) => d.categorySlug === query.categorySlug);
  }
}
