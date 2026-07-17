/**
 * Errores de gestión del catálogo maestro de insumos (#222). El dominio y la
 * aplicación los lanzan; el filtro HTTP (`supplies-domain-exception.filter.ts`)
 * los mapea a códigos de estado. `SupplyValidationError` (invariantes del
 * agregado) vive en `supply.ts`.
 */

export class SupplyNotFoundError extends Error {
  constructor(id: string) {
    super(`Supply not found: ${id}`);
    this.name = 'SupplyNotFoundError';
  }
}

export class SupplyCodeConflictError extends Error {
  constructor(code: string) {
    super(`Supply code already exists: ${code}`);
    this.name = 'SupplyCodeConflictError';
  }
}

export class VariantTargetNotFoundError extends Error {
  constructor(variantOfId: string) {
    super(`Variant target supply not found: ${variantOfId}`);
    this.name = 'VariantTargetNotFoundError';
  }
}

export class MergeIntoSelfError extends Error {
  constructor(id: string) {
    super(`Cannot merge a supply into itself: ${id}`);
    this.name = 'MergeIntoSelfError';
  }
}

export class AliasConflictError extends Error {
  constructor(alias: string) {
    super(`Alias already mapped to a supply: ${alias}`);
    this.name = 'AliasConflictError';
  }
}

export class CategoryNotFoundError extends Error {
  constructor(slug: string) {
    super(`Category not found: ${slug}`);
    this.name = 'CategoryNotFoundError';
  }
}

/**
 * Colisión de `key` de atributo a lo largo de la ascendencia de categoría al
 * resolver el esquema efectivo (#396): dos {@link AttributeDefinition} en el
 * árbol (p.ej. una en la categoría y otra en un ancestro) comparten `key`. La
 * extensión es aditiva, sin precedencia, así que se rechaza. El filtro HTTP la
 * mapea a 422.
 */
export class AttributeKeyCollisionError extends Error {
  constructor(key: string) {
    super(
      `Attribute key "${key}" is defined more than once in the category ancestry`,
    );
    this.name = 'AttributeKeyCollisionError';
  }
}

/**
 * Los atributos de un `Supply` no validan contra el esquema efectivo de su
 * familia (#396): requerido ausente, tipo/enum inválido, unidad inconsistente,
 * o clave desconocida. Lista las claves ofensoras. El filtro HTTP la mapea a 400.
 */
export class AttributeValidationError extends Error {
  readonly keys: string[];

  constructor(keys: string[], detail?: string) {
    const list = keys.join(', ');
    super(
      detail
        ? `Invalid supply attributes (${list}): ${detail}`
        : `Invalid supply attributes: ${list}`,
    );
    this.name = 'AttributeValidationError';
    this.keys = keys;
  }
}
