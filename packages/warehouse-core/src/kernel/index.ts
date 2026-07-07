/**
 * kernel — value objects and primitives del núcleo de material, reutilizados
 * por todos los contextos que manejan líneas de material (needs, offers,
 * resources, logistics) y por el futuro WMS standalone.
 *
 * No depende de infraestructura, NestJS ni ORM: es dominio puro.
 */
export { Category, isCoreCategory, getCategoryPrefix } from './category.js';
export type {
  CategoryDefinition,
  CategoryTranslation,
  CategoryKind,
} from './category-definition.js';
export { SupplyLine, SupplyLineValidationError } from './supply-line.js';
export type { SupplyLineProps, SupplyLineSnapshot } from './supply-line.js';
export { ScopeId, ScopeIdValidationError } from './scope-id.js';
