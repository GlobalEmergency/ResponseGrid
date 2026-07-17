import { CategoryRepository } from '@globalemergency/warehouse-core/catalog';
import { CategoryDefinition } from '@globalemergency/warehouse-core/kernel';

/**
 * Lists the canonical category taxonomy (slug + labels + hierarchy + order).
 * Reference data shared across the platform; powers a public `GET /categories`
 * so clients can render categories from a single source instead of hardcoding.
 */
export class ListCategories {
  constructor(private readonly repo: CategoryRepository) {}

  execute(options?: {
    includeArchived?: boolean;
  }): Promise<CategoryDefinition[]> {
    return this.repo.listCategories(options);
  }
}
