import { Supply, SupplyStatus } from '../supply';
import { SupplyAlias } from '../supply-alias';

export const SUPPLY_REPOSITORY = Symbol('SUPPLY_REPOSITORY');

/** Filtro de listado admin del catálogo (incluye archivados por defecto). */
export interface SupplyListFilter {
  categorySlug?: string;
  status?: SupplyStatus;
  /** Búsqueda libre por código o nombre (normalizada en infraestructura). */
  q?: string;
}

/**
 * Puerto de persistencia del agregado `Supply` (escritura / gestión interna).
 * La implementación Drizzle vive en infrastructure; el dominio/aplicación solo
 * dependen de esta interfaz (DIP). Mockeable en tests.
 *
 * La cara PÚBLICA (autocomplete del catálogo) NO usa este puerto: tiene su
 * propio `SupplyCatalogReadModel` con proyecciones sin datos internos.
 *
 * Los alias y el `merge` viven aquí (no en un puerto aparte) para que el
 * adaptador pueda fusionar `supplies` + `supply_aliases` en una sola
 * transacción.
 */
export interface SupplyRepository {
  findById(id: string): Promise<Supply | null>;
  findByCode(code: string): Promise<Supply | null>;
  save(supply: Supply): Promise<void>;
  /** Obtiene el siguiente valor de la secuencia para códigos de insumos. */
  nextSequenceValue(): Promise<number>;
  /** Listado de gestión: incluye archivados; filtra por categoría/estado/búsqueda. */
  list(filter: SupplyListFilter): Promise<Supply[]>;
  listAliases(supplyId: string): Promise<SupplyAlias[]>;
  addAlias(alias: SupplyAlias): Promise<void>;
  removeAlias(aliasNorm: string): Promise<void>;
  /**
   * Fusiona `sourceId` en `targetId`: mueve los alias de A a B, repunta las
   * variantes hijas de A a B y archiva A. No borra A (preserva referencias
   * legadas). Transaccional.
   */
  merge(sourceId: string, targetId: string): Promise<void>;
}
