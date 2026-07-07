/**
 * catalog — master data del material: el catálogo `Supply` (insumos), la
 * resolución de texto→id (supply/category resolvers), alias/normalización y los
 * ports de catálogo. Depende del módulo `kernel` (Category/CategoryDefinition).
 *
 * Dominio puro: sin NestJS, ORM ni infraestructura. Los adapters (Drizzle) y
 * los casos de uso HTTP los aporta cada host.
 */
export * from './supply.js';
export * from './supply-alias.js';
export * from './supply-normalize.js';
export * from './supply-resolver.js';
export * from './category-resolver.js';
export * from './supply-errors.js';
export * from './localized-text.js';
export * from './ports/supply.repository.js';
export * from './ports/category.repository.js';
export * from './ports/supply-catalog.read-model.js';
export * from './ports/supply-link-backfill.repository.js';
