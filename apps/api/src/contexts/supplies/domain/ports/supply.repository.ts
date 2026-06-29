import { Supply } from '../supply';

export const SUPPLY_REPOSITORY = Symbol('SUPPLY_REPOSITORY');

/** Parámetros de búsqueda/autocomplete del catálogo (#220). */
export interface SupplySearchParams {
  /** Texto libre: resuelto por nombre o alias (vía SupplyResolver). */
  query?: string;
  /** Filtra por categoría (slug de `categories`). */
  categorySlug?: string;
  limit: number;
  offset: number;
}

/**
 * Puerto de persistencia del catálogo maestro de insumos. La implementación
 * Drizzle vive en infrastructure; el dominio/aplicación solo dependen de esta
 * interfaz (DIP). Mockeable en tests.
 */
export interface SupplyRepository {
  findById(id: string): Promise<Supply | null>;
  findByCode(code: string): Promise<Supply | null>;
  search(params: SupplySearchParams): Promise<Supply[]>;
  save(supply: Supply): Promise<void>;
}
