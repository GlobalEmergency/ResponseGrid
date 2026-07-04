import { CategoryRecord } from '../domain/category-record';
import { CategoryAdminRepository } from '../domain/ports/category-admin.repository';

/**
 * Lista la taxonomía completa para la API interna/admin (#221), incluyendo las
 * categorías archivadas (la lectura pública `ListCategories` las excluye).
 */
export class ListAdminCategories {
  constructor(private readonly repo: CategoryAdminRepository) {}

  execute(options?: { includeArchived?: boolean }): Promise<CategoryRecord[]> {
    return this.repo.list(options);
  }
}
