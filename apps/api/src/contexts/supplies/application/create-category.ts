import {
  CategoryAlreadyExistsError,
  CategoryParentNotFoundError,
  CategoryValidationError,
} from '../domain/category-errors';
import { CategoryRecord } from '../domain/category-record';
import {
  CategoryAdminRepository,
  CategoryTranslationInput,
} from '../domain/ports/category-admin.repository';

export interface CreateCategoryCommand {
  slug: string;
  labelEs: string;
  labelEn: string;
  parentSlug: string | null;
  vertical: string;
  sort: number;
  translations?: readonly CategoryTranslationInput[] | undefined;
}

/**
 * Alta de categoría/subcategoría (#221). Todas las invariantes viven aquí; el
 * adaptador solo persiste. El slug lo valida en formato el DTO HTTP.
 */
export class CreateCategory {
  constructor(private readonly repo: CategoryAdminRepository) {}

  async execute(cmd: CreateCategoryCommand): Promise<CategoryRecord> {
    const slug = cmd.slug.trim();
    const labelEs = cmd.labelEs.trim();
    const labelEn = cmd.labelEn.trim();
    const vertical = cmd.vertical.trim();
    const parentSlug = cmd.parentSlug === null ? null : cmd.parentSlug.trim();

    if (slug === '') {
      throw new CategoryValidationError(
        'El slug de la categoría es obligatorio',
      );
    }
    if (labelEs === '' || labelEn === '') {
      throw new CategoryValidationError('Las etiquetas es/en son obligatorias');
    }
    if (vertical === '') {
      throw new CategoryValidationError('El vertical es obligatorio');
    }
    if (parentSlug === slug) {
      throw new CategoryValidationError(
        'Una categoría no puede ser su propio padre',
      );
    }
    if ((await this.repo.findBySlug(slug)) !== null) {
      throw new CategoryAlreadyExistsError(slug);
    }
    if (
      parentSlug !== null &&
      (await this.repo.findBySlug(parentSlug)) === null
    ) {
      throw new CategoryParentNotFoundError(parentSlug);
    }

    return this.repo.create({
      slug,
      labelEs,
      labelEn,
      parentSlug,
      vertical,
      sort: cmd.sort,
      archivedAt: null,
      translations: cmd.translations ?? [],
    });
  }
}
