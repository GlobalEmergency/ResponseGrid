export const SUPPLY_CATALOG_READ_MODEL = Symbol('SUPPLY_CATALOG_READ_MODEL');

/**
 * Proyección PÚBLICA de un insumo del catálogo maestro. Es la cara que consume
 * gente externa (autocomplete, app web): contiene **solo datos publicables**.
 *
 * Deliberadamente NO incluye campos de gestión interna (`status`,
 * `registrationNotes`): esos viven únicamente en la API interna a través del
 * agregado `Supply` y su `SupplyRepository`. El read-model solo materializa
 * insumos `active`, así que el estado no necesita exponerse.
 */
export interface PublicSupplyRecord {
  id: string;
  code: string;
  /** Nombre canónico base (`es`), la fuente de la verdad. */
  name: string;
  /** Traducciones del nombre por idioma (`locale -> name`), N idiomas. */
  translations: Record<string, string>;
  categorySlug: string;
  /** Etiqueta base de la categoría (`es`). */
  categoryLabel: string;
  /** Traducciones de la etiqueta de categoría (`locale -> label`), N idiomas. */
  categoryTranslations: Record<string, string>;
  defaultUnit: string | null;
  attributes: Record<string, unknown>;
  variantOfId: string | null;
  aliases: string[];
}

/**
 * Puerto de LECTURA del catálogo público (CQRS-light). Separado del
 * `SupplyRepository` (escritura/gestión interna) para que la cara pública no
 * pueda fugar datos internos: aquí solo existen proyecciones publicables.
 *
 * Expone únicamente la carga del catálogo activo; el detalle por id y la
 * búsqueda se resuelven en la aplicación sobre esta lista (cacheada), sin
 * lógica de consulta extra en infraestructura.
 */
export interface SupplyCatalogReadModel {
  /** Insumos `active` del catálogo, como proyección pública. */
  listActive(): Promise<PublicSupplyRecord[]>;
}
