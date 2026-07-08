import { AttributeDefinition } from '../attribute-definition.js';

export const ATTRIBUTE_DEFINITION_REPOSITORY = Symbol(
  'ATTRIBUTE_DEFINITION_REPOSITORY',
);

/**
 * Puerto de persistencia del metamodelo `AttributeDefinition` (#396). La
 * implementación Drizzle vive en infraestructura; el dominio/aplicación sólo
 * dependen de esta interfaz (DIP). Mockeable en tests.
 *
 * Inc 1: el catálogo es global (`scopeId === null`). Los métodos `*Scope`
 * aceptan un `scopeId` para que la tenencia (Inc 2) los reutilice sin cambiar
 * la firma; hoy los hosts pasan `null`.
 */
export interface AttributeDefinitionRepository {
  /**
   * Todas las definiciones de un scope (Inc 1: `null` = globales). Base para
   * resolver el esquema efectivo en memoria vía `resolveEffectiveSchema`.
   */
  findByScope(scopeId: string | null): Promise<AttributeDefinition[]>;
  /**
   * Las definiciones ancladas a la categoría dada o a cualquiera de sus
   * ancestros — el conjunto exacto que compone el esquema efectivo de la
   * familia. `ancestorSlugs` incluye la propia categoría.
   */
  findByCategoryAncestry(
    ancestorSlugs: readonly string[],
    scopeId: string | null,
  ): Promise<AttributeDefinition[]>;
  /** Una definición concreta (categoría + key + scope), o null. */
  findOne(
    categorySlug: string,
    key: string,
    scopeId: string | null,
  ): Promise<AttributeDefinition | null>;
  /** Alta/actualización idempotente (upsert por categoría + key + scope). */
  save(definition: AttributeDefinition): Promise<void>;
  /** Marca la definición como archivada (soft-delete: preserva histórico). */
  archive(
    categorySlug: string,
    key: string,
    scopeId: string | null,
  ): Promise<void>;
}
