import { isCoreCategory } from '../domain/category';
import {
  CategoryNotFoundError,
  CategoryProtectedError,
} from '../domain/category-errors';
import { CategoryRecord } from '../domain/category-record';
import { CategoryAdminRepository } from '../domain/ports/category-admin.repository';

/**
 * Borrado de una categoría (#221). Las categorías núcleo (slug del enum
 * {@link Category}) están protegidas → 4xx. El resto se archiva (soft-delete):
 * nunca hacemos DELETE físico porque el slug lo referencian insumos/aliases.
 */
export class DeleteCategory {
  constructor(private readonly repo: CategoryAdminRepository) {}

  async execute(slug: string): Promise<CategoryRecord> {
    if (isCoreCategory(slug)) {
      throw new CategoryProtectedError(slug);
    }
    const current = await this.repo.findBySlug(slug);
    if (!current) {
      throw new CategoryNotFoundError(slug);
    }
    return this.repo.update(slug, {
      slug: current.slug,
      labelEs: current.labelEs,
      labelEn: current.labelEn,
      parentSlug: current.parentSlug,
      vertical: current.vertical,
      sort: current.sort,
      archivedAt: current.archivedAt ?? new Date(),
      translations: current.translations,
    });
  }
}
