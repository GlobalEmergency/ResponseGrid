import { Module } from '@nestjs/common';
import { DB, DatabaseModule } from '../../shared/database.module';
import { Db } from '../../shared/db';
import {
  CATEGORY_REPOSITORY,
  CategoryRepository,
} from './domain/ports/category.repository';
import { DrizzleCategoryRepository } from './infrastructure/drizzle/drizzle-category.repository';
import { ListCategories } from './application/list-categories';
import { CategoriesController } from './infrastructure/http/categories.controller';

const categoryRepositoryProvider = {
  provide: CATEGORY_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): CategoryRepository => new DrizzleCategoryRepository(db),
};

const listCategoriesProvider = {
  provide: ListCategories,
  inject: [CATEGORY_REPOSITORY],
  useFactory: (repo: CategoryRepository): ListCategories =>
    new ListCategories(repo),
};

/**
 * Supplies — the supplies/insumos domain. Owns the category taxonomy and the
 * supply catalog; provides the SupplyLine value object reused by needs, offers
 * and resources (inventory). Absorbs the former taxonomy context.
 */
@Module({
  imports: [DatabaseModule],
  controllers: [CategoriesController],
  providers: [categoryRepositoryProvider, listCategoriesProvider],
  exports: [CATEGORY_REPOSITORY],
})
export class SuppliesModule {}
