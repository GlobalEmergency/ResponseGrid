import {
  CategoryAlreadyExistsError,
  CategoryParentNotFoundError,
  CategoryValidationError,
} from './category-admin.errors';
import { CategoryDefinition } from '../domain/category-definition';
import {
  CategoryRepository,
  CategoryWriteInput,
} from '../domain/ports/category.repository';

export type CreateCategoryCommand = CategoryWriteInput;

export class CreateCategory {
  constructor(private readonly repo: CategoryRepository) {}

  async execute(cmd: CreateCategoryCommand): Promise<CategoryDefinition> {
    const slug = cmd.slug.trim();
    if (slug === '') {
      throw new CategoryValidationError('Category slug is required');
    }
    if (cmd.labelEs.trim() === '' || cmd.labelEn.trim() === '') {
      throw new CategoryValidationError('Category labels are required');
    }
    if (cmd.vertical.trim() === '') {
      throw new CategoryValidationError('Category vertical is required');
    }
    if (
      (await this.repo.findBySlug(slug, { includeArchived: true })) !== null
    ) {
      throw new CategoryAlreadyExistsError(slug);
    }
    if (cmd.parentSlug !== null) {
      const parent = await this.repo.findBySlug(cmd.parentSlug, {
        includeArchived: false,
      });
      if (!parent) {
        throw new CategoryParentNotFoundError(cmd.parentSlug);
      }
    }

    return await this.repo.createCategory({
      ...cmd,
      slug,
      parentSlug: cmd.parentSlug,
      archivedAt: cmd.archivedAt ?? null,
      translations: cmd.translations ?? [],
    });
  }
}
