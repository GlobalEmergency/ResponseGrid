import { CategoryDefinition } from '../category-definition';

export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');

export interface CategoryRepository {
  loadAliasMap(): Promise<Map<string, string>>;
  listCategories(): Promise<CategoryDefinition[]>;
}
