/**
 * @globalemergency/warehouse-core — núcleo reutilizable de gestión de almacén.
 *
 * Punto de entrada raíz. Prefiere importar desde el módulo concreto
 * (p. ej. `@globalemergency/warehouse-core/kernel`) para mantener fronteras
 * explícitas y aprovechar el tree-shaking.
 */
export * from './kernel/index.js';
export * from './catalog/index.js';
export * from './containers/index.js';
export * from './logistics/index.js';
