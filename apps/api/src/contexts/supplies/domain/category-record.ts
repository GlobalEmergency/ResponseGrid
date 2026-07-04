import { CategoryDefinition } from './category-definition';

/**
 * CategoryRecord — la vista INTERNA/admin de una categoría: la proyección
 * pública ({@link CategoryDefinition}) más los campos de gestión que NO deben
 * salir por la API pública. Hoy: `archivedAt` (soft-archive). La API interna
 * (`/admin/categories`, permiso `catalogue:manage`) trabaja con este modelo;
 * el `GET /categories` público sigue devolviendo solo `CategoryDefinition`.
 */
export interface CategoryRecord extends CategoryDefinition {
  /** Marca de archivado (ocultado). `null` = activa. Solo API interna. */
  archivedAt: Date | null;
}
