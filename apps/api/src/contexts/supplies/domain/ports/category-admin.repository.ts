import { CategoryRecord } from '../category-record';

export const CATEGORY_ADMIN_REPOSITORY = Symbol('CATEGORY_ADMIN_REPOSITORY');

export interface CategoryTranslationInput {
  locale: string;
  label: string;
}

/**
 * Estado completo con el que se persiste una categoría (incluye campos
 * internos). Los casos de uso construyen esto tras validar sus invariantes; el
 * adaptador es persistencia "tonta" (no revalida reglas de negocio).
 */
export interface CategoryWriteInput {
  slug: string;
  labelEs: string;
  labelEn: string;
  parentSlug: string | null;
  vertical: string;
  sort: number;
  archivedAt: Date | null;
  /** Idiomas adicionales (además de es/en, que viven en label_es/label_en). */
  translations: readonly CategoryTranslationInput[];
}

/**
 * Puerto de la API interna/admin del catálogo de categorías (#221). Separado
 * del `CategoryRepository` de lectura pública (ISP): este ve categorías
 * archivadas y permite escritura; aquél solo proyecta lo publicable.
 */
export interface CategoryAdminRepository {
  list(options?: { includeArchived?: boolean }): Promise<CategoryRecord[]>;
  findBySlug(slug: string): Promise<CategoryRecord | null>;
  create(input: CategoryWriteInput): Promise<CategoryRecord>;
  update(slug: string, input: CategoryWriteInput): Promise<CategoryRecord>;
}
