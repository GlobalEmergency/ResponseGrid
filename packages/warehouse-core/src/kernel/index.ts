/**
 * kernel — value objects and primitives del núcleo de material, reutilizados
 * por todos los contextos que manejan líneas de material (needs, offers,
 * resources, logistics) y por el futuro WMS standalone.
 *
 * No depende de infraestructura, NestJS ni ORM: es dominio puro.
 */
export {
  Category,
  CORE_CATEGORY_SLUGS,
  isCoreCategory,
  getCategoryPrefix,
} from './category.js';
export type {
  CategoryDefinition,
  CategoryTranslation,
  CategoryKind,
} from './category-definition.js';
export { CategorySlug } from './category-slug.js';
export {
  CategoryValidationError,
  UnknownCategoryError,
} from './category-errors.js';
export { CategoryRegistry } from './category-registry.js';
export type { CategoryNode } from './category-registry.js';
export { SupplyLine, SupplyLineValidationError } from './supply-line.js';
export type { SupplyLineProps, SupplyLineSnapshot } from './supply-line.js';
export { ScopeId, ScopeIdValidationError } from './scope-id.js';
export {
  ExternalCodesValidationError,
  isExternalCodeNamespace,
  normalizeExternalCodes,
} from './external-codes.js';
export type { ExternalCodes } from './external-codes.js';
export type { DomainEvent } from './domain-event.js';
export { haversineMeters } from './geo-distance.js';
export {
  Capacity,
  CapacityMustHaveWeightOrVolumeError,
  InvalidCapacityAmountError,
} from './capacity.js';
export type { CapacityProps } from './capacity.js';
