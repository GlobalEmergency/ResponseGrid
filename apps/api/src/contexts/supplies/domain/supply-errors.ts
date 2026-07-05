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
