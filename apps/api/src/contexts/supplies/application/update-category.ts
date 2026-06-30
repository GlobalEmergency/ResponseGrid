import {
  CategoryNotFoundError,
  CategoryParentNotFoundError,
  CategoryValidationError,
} from './category-admin.errors';
import { isCoreCategory } from '../domain/category';
import { CategoryRepository } from '../domain/ports/category.repository';
import { CategoryDefinition } from '../domain/category-definition';

export interface UpdateCategoryCommand {
  labelEs?: string | undefined;
  labelEn?: string | undefined;
  parentSlug?: string | null | undefined;
  vertical?: string | undefined;
  sort?: number | undefined;
  archived?: boolean | undefined;
  translations?: CategoryDefinition['translations'] | undefined;
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

    const nextLabelEs = (cmd.labelEs ?? current.labelEs).trim();
    const nextLabelEn = (cmd.labelEn ?? current.labelEn).trim();
    const nextVertical = (cmd.vertical ?? current.vertical).trim();
    if (nextLabelEs === '' || nextLabelEn === '') {
      throw new CategoryValidationError('Category labels are required');
    }
    if (nextVertical === '') {
      throw new CategoryValidationError('Category vertical is required');
    }
    if (cmd.parentSlug !== undefined && cmd.parentSlug === current.slug) {
      throw new CategoryValidationError('A category cannot be its own parent');
    }
    if (cmd.parentSlug !== undefined && cmd.parentSlug !== null) {
      const parent = await this.repo.findBySlug(cmd.parentSlug, {
        includeArchived: false,
      });
      if (!parent) {
        throw new CategoryParentNotFoundError(cmd.parentSlug);
      }
    }
    if (cmd.archived === true && isCoreCategory(current.slug)) {
      throw new CategoryValidationError('Core categories cannot be archived');
    }

    return await this.repo.updateCategory(currentSlug, {
      slug: current.slug,
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
  }
}
