import { Category } from '../category';

export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');

export interface CategoryRepository {
  loadAliasMap(): Promise<Map<string, string>>;
  listCategories(): Promise<Category[]>;
}
