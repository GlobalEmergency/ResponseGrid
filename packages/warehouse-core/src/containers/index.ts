/**
 * containers — unidad de empaquetado rastreable (palet/caja/lote). Aggregate
 * `Container` (agrupa `SupplyLine`s y compone por referencia), su id, enums,
 * errores, formateo de código y el port de repositorio.
 *
 * Opera contra un `ScopeId` opaco (la tenencia): el paquete no sabe si es una
 * emergencia (ResponseGrid) o una organización (WMS standalone). Dominio puro.
 */
export * from './container.js';
export * from './container-id.js';
export * from './container-enums.js';
export * from './container-errors.js';
export * from './container-code.js';
export * from './ports/container.repository.js';
