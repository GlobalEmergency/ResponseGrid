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
  useFactory: (db: Db): CategoryRepository =>
    new DrizzleCategoryRepository(db),
};

@Module({
  imports: [DatabaseModule],
  providers: [categoryRepositoryProvider],
  exports: [CATEGORY_REPOSITORY],
})
export class TaxonomyModule {}
