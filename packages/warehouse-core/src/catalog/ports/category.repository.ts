import { CategoryDefinition } from '../../kernel/index.js';

export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');

export interface CategoryListOptions {
  includeArchived?: boolean;
}

export interface CategoryTranslationInput {
  locale: string;
  label: string;
}

export interface CategoryWriteInput {
  slug: string;
  labelEs: string;
  labelEn: string;
  parentSlug: string | null;
  vertical: string;
  sort: number;
  archivedAt?: Date | null;
  translations?: readonly CategoryTranslationInput[];
  /** Códigos externos estándar para interop (#398). Por defecto `{}`. */
  externalCodes?: Record<string, string> | null;
}

export interface CategoryRepository {
  loadAliasMap(): Promise<Map<string, string>>;
  listCategories(options?: CategoryListOptions): Promise<CategoryDefinition[]>;
  findBySlug(
    slug: string,
    options?: CategoryListOptions,
  ): Promise<CategoryDefinition | null>;
  createCategory(input: CategoryWriteInput): Promise<CategoryDefinition>;
  updateCategory(
    slug: string,
    input: CategoryWriteInput,
  ): Promise<CategoryDefinition>;
}
