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
  nameEs: string;
  nameEn: string | null;
  categorySlug: string;
  categoryLabelEs: string;
  categoryLabelEn: string | null;
  defaultUnit: string | null;
  attributes: Record<string, unknown>;
  variantOfId: string | null;
  aliases: string[];
}

/**
 * Puerto de LECTURA del catálogo público (CQRS-light). Separado del
 * `SupplyRepository` (escritura/gestión interna) para que la cara pública no
 * pueda fugar datos internos: aquí solo existen proyecciones publicables.
 */
export interface SupplyCatalogReadModel {
  /** Insumos `active` del catálogo, como proyección pública. */
  listActive(): Promise<PublicSupplyRecord[]>;
  /** Un insumo `active` por id, o `null` si no existe / está archivado. */
  findActiveById(id: string): Promise<PublicSupplyRecord | null>;
}
