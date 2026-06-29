import {
  CategoryImmutableSlugError,
  CategoryNotFoundError,
  CategoryValidationError,
} from './category-admin.errors';
import { Category } from '../domain/category';
import {
  CategoryRepository,
  CategoryWriteInput,
} from '../domain/ports/category.repository';
import { CategoryDefinition } from '../domain/category-definition';

export interface UpdateCategoryCommand {
  slug?: string | undefined;
  labelEs?: string | undefined;
  labelEn?: string | undefined;
  parentSlug?: string | null | undefined;
  vertical?: string | undefined;
  sort?: number | undefined;
  archived?: boolean | undefined;
  translations?: CategoryWriteInput['translations'] | undefined;
}

export class UpdateCategory {
  constructor(private readonly repo: CategoryRepository) {}

  async execute(
    currentSlug: string,
    cmd: UpdateCategoryCommand,
  ): Promise<CategoryDefinition> {
    const current = await this.repo.findBySlug(currentSlug, {
      includeArchived: true,
    });
    if (!current) {
      throw new CategoryNotFoundError(currentSlug);
    }

    const nextSlug = cmd.slug?.trim() ?? current.slug;
    if (nextSlug === '') {
      throw new CategoryValidationError('Category slug is required');
    }
    const nextLabelEs = (cmd.labelEs ?? current.labelEs).trim();
    const nextLabelEn = (cmd.labelEn ?? current.labelEn).trim();
    const nextVertical = (cmd.vertical ?? current.vertical).trim();
    if (nextLabelEs === '' || nextLabelEn === '') {
      throw new CategoryValidationError('Category labels are required');
    }
    if (nextVertical === '') {
      throw new CategoryValidationError('Category vertical is required');
    }
    if (current.slug !== nextSlug) {
      if (Object.values(Category).includes(current.slug as Category)) {
        throw new CategoryImmutableSlugError(current.slug);
      }
      throw new CategoryValidationError('Category slug cannot be changed');
    }
    if (cmd.parentSlug !== undefined && cmd.parentSlug === nextSlug) {
      throw new CategoryValidationError('A category cannot be its own parent');
    }

    await this.repo.updateCategory(currentSlug, {
      slug: nextSlug,
      labelEs: nextLabelEs,
      labelEn: nextLabelEn,
      parentSlug:
        cmd.parentSlug !== undefined ? cmd.parentSlug : current.parentSlug,
      vertical: nextVertical,
      sort: cmd.sort ?? current.sort,
      archivedAt:
        cmd.archived === undefined
          ? current.archivedAt
          : cmd.archived
            ? new Date()
            : null,
      translations: cmd.translations ?? current.translations,
    });

    const updated = await this.repo.findBySlug(nextSlug, {
      includeArchived: true,
    });
    if (!updated) {
      throw new CategoryValidationError(
        'Category was updated but cannot be reloaded',
      );
    }
    return updated;
  }
}
