import {
  CategoryNotFoundError,
  CategoryParentNotFoundError,
  CategoryValidationError,
} from '../domain/category-errors';
import { CategoryRecord } from '../domain/category-record';
import {
  CategoryAdminRepository,
  CategoryTranslationInput,
} from '../domain/ports/category-admin.repository';

export interface UpdateCategoryCommand {
  labelEs?: string | undefined;
  labelEn?: string | undefined;
  parentSlug?: string | null | undefined;
  vertical?: string | undefined;
  sort?: number | undefined;
  archived?: boolean | undefined;
  translations?: readonly CategoryTranslationInput[] | undefined;
}

/**
 * Edición de una categoría (#221): etiquetas, orden, padre, idiomas y flag de
 * archivado. El `slug` es inmutable (es PK y lo referencian otras tablas y el
 * enum núcleo), por eso no se expone rename. Archivar/editar vale también para
 * categorías núcleo; borrarlas/renombrarlas no (ver DeleteCategory).
 */
export class UpdateCategory {
  constructor(private readonly repo: CategoryAdminRepository) {}

  async execute(
    slug: string,
    cmd: UpdateCategoryCommand,
  ): Promise<CategoryRecord> {
    const current = await this.repo.findBySlug(slug);
    if (!current) {
      throw new CategoryNotFoundError(slug);
    }

    const labelEs = (cmd.labelEs ?? current.labelEs).trim();
    const labelEn = (cmd.labelEn ?? current.labelEn).trim();
    const vertical = (cmd.vertical ?? current.vertical).trim();
    if (labelEs === '' || labelEn === '') {
      throw new CategoryValidationError('Las etiquetas es/en son obligatorias');
    }
    if (vertical === '') {
      throw new CategoryValidationError('El vertical es obligatorio');
    }

    const parentSlug =
      cmd.parentSlug === undefined
        ? current.parentSlug
        : cmd.parentSlug === null
          ? null
          : cmd.parentSlug.trim();
    if (parentSlug === slug) {
      throw new CategoryValidationError(
        'Una categoría no puede ser su propio padre',
      );
    }
    if (
      parentSlug !== null &&
      parentSlug !== current.parentSlug &&
      (await this.repo.findBySlug(parentSlug)) === null
    ) {
      throw new CategoryParentNotFoundError(parentSlug);
    }

    const archivedAt =
      cmd.archived === undefined
        ? current.archivedAt
        : cmd.archived
          ? (current.archivedAt ?? new Date())
          : null;

    return this.repo.update(slug, {
      slug: current.slug,
      labelEs,
      labelEn,
      parentSlug,
      vertical,
      sort: cmd.sort ?? current.sort,
      archivedAt,
      translations: cmd.translations ?? current.translations,
    });
  }
}
