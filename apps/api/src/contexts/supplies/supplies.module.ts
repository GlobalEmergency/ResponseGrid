import { Module } from '@nestjs/common';
import { DB, DatabaseModule } from '../../shared/database.module';
import { Db } from '../../shared/db';
import {
  CATEGORY_REPOSITORY,
  CategoryRepository,
} from './domain/ports/category.repository';
import { DrizzleCategoryRepository } from './infrastructure/drizzle/drizzle-category.repository';

const categoryRepositoryProvider = {
  provide: CATEGORY_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): CategoryRepository => new DrizzleCategoryRepository(db),
};

/**
 * Supplies — the supplies/insumos domain. Owns the category taxonomy and the
 * supply catalog; provides the SupplyLine value object reused by needs, offers
 * and resources (inventory). Absorbs the former taxonomy context.
 */
@Module({
  imports: [DatabaseModule],
  providers: [categoryRepositoryProvider],
  exports: [CATEGORY_REPOSITORY],
})
export class SuppliesModule {}
