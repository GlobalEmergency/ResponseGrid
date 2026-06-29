import { Supply } from '../supply';

export const SUPPLY_REPOSITORY = Symbol('SUPPLY_REPOSITORY');

/**
 * Puerto de persistencia del agregado `Supply` (escritura / gestión interna).
 * La implementación Drizzle vive en infrastructure; el dominio/aplicación solo
 * dependen de esta interfaz (DIP). Mockeable en tests.
 *
 * La cara PÚBLICA (autocomplete del catálogo) NO usa este puerto: tiene su
 * propio `SupplyCatalogReadModel` con proyecciones sin datos internos.
 */
export interface SupplyRepository {
  findById(id: string): Promise<Supply | null>;
  findByCode(code: string): Promise<Supply | null>;
  save(supply: Supply): Promise<void>;
}
