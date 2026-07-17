import { Supply, SupplyStatus } from '../supply.js';
import { SupplyAlias } from '../supply-alias.js';

export const SUPPLY_REPOSITORY = Symbol('SUPPLY_REPOSITORY');

/** Filtro de listado admin del catálogo (incluye archivados por defecto). */
export interface SupplyListFilter {
  categorySlug?: string;
  status?: SupplyStatus;
  /** Búsqueda libre por código o nombre (normalizada en infraestructura). */
  q?: string;
  /**
   * Tenencia (#397): visibilidad por scope. `undefined`/`null` = sólo globales
   * (comportamiento por defecto de los hosts HTTP, que hoy operan en global). Un
   * `scopeId` de tenant devuelve **global ∪ tenant** (nunca otros tenants).
   */
  scopeId?: string | null;
}

/**
 * Traducción del nombre de un insumo a un locale concreto (i18n admin, #320).
 * El nombre base (`es`) vive en `supplies.name`; estas filas alimentan
 * `supply_translations` y la proyección `name` locale-aware (N idiomas) del
 * catálogo público. El locale se normaliza (trim + lowercase) en infraestructura.
 */
export interface SupplyTranslationInput {
  locale: string;
  name: string;
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
  /**
   * Busca por código. Tenencia (#397): `scopeId` `undefined`/`null` = sólo
   * globales; un tenant busca en global ∪ tenant. Por defecto global.
   */
  findByCode(code: string, scopeId?: string | null): Promise<Supply | null>;
  /**
   * Persiste el agregado. Si `translations` se indica, REEMPLAZA por completo el
   * conjunto de traducciones del insumo en `supply_translations` (quitar una
   * locale del array la borra); si es `undefined`, las deja intactas —así el
   * alta/archivado/edición sin i18n no toca las traducciones existentes.
   */
  save(
    supply: Supply,
    translations?: readonly SupplyTranslationInput[],
  ): Promise<void>;
  /** Obtiene el siguiente valor de la secuencia para códigos de insumos. */
  nextSequenceValue(): Promise<number>;
  /** Listado de gestión: incluye archivados; filtra por categoría/estado/búsqueda. */
  list(filter: SupplyListFilter): Promise<Supply[]>;
  /** Traducciones de nombre del insumo (i18n admin, #320), ordenadas por locale. */
  listTranslations(supplyId: string): Promise<SupplyTranslationInput[]>;
  listAliases(supplyId: string): Promise<SupplyAlias[]>;
  /**
   * Añade un alias. Tenencia (#397): el `scopeId` del propio `SupplyAlias`
   * decide el candado de unicidad (global vs tenant). Idempotente si ya apunta
   * al mismo insumo dentro de ese scope; conflicto si apunta a otro.
   */
  addAlias(alias: SupplyAlias): Promise<void>;
  /**
   * Elimina un alias por su forma normalizada dentro del scope dado
   * (`undefined`/`null` = global). No cruza scopes.
   */
  removeAlias(aliasNorm: string, scopeId?: string | null): Promise<void>;
  /**
   * Fusiona `sourceId` en `targetId`: mueve los alias de A a B, repunta las
   * variantes hijas de A a B y archiva A. No borra A (preserva referencias
   * legadas). Transaccional.
   */
  merge(sourceId: string, targetId: string): Promise<void>;
}
