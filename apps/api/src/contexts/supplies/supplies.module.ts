import { Module } from '@nestjs/common';
import { DB, DatabaseModule } from '../../shared/database.module';
import { Db } from '../../shared/db';
import {
  CATEGORY_REPOSITORY,
  CategoryRepository,
} from './domain/ports/category.repository';
import {
  CONTAINER_REPOSITORY,
  ContainerRepository,
} from './domain/ports/container.repository';
import {
  CONTAINER_AUTHORIZATION_LOOKUP,
  ContainerAuthorizationLookup,
} from './domain/ports/container-authorization-lookup';
import { DrizzleCategoryRepository } from './infrastructure/drizzle/drizzle-category.repository';
import { DrizzleContainerRepository } from './infrastructure/drizzle/drizzle-container.repository';
import { DrizzleContainerAuthorizationLookup } from './infrastructure/drizzle/drizzle-container-authorization-lookup';
import { ListCategories } from './application/list-categories';
import { CreateContainer } from './application/create-container';
import { AddLineToContainer } from './application/add-line-to-container';
import { RemoveLineFromContainer } from './application/remove-line-from-container';
import { NestContainer } from './application/nest-container';
import { SealContainer } from './application/seal-container';
import { MoveContainer } from './application/move-container';
import { GetContainer } from './application/get-container';
import { ListContainers } from './application/list-containers';
import { CategoriesController } from './infrastructure/http/categories.controller';
import { ContainerController } from './infrastructure/http/containers.controller';
import { IdentityModule } from '../identity/infrastructure/identity.module';

const categoryRepositoryProvider = {
  provide: CATEGORY_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): CategoryRepository => new DrizzleCategoryRepository(db),
};

const containerRepositoryProvider = {
  provide: CONTAINER_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): ContainerRepository =>
    new DrizzleContainerRepository(db),
};

const containerAuthorizationLookupProvider = {
  provide: CONTAINER_AUTHORIZATION_LOOKUP,
  inject: [DB],
  useFactory: (db: Db): ContainerAuthorizationLookup =>
    new DrizzleContainerAuthorizationLookup(db),
};

const listCategoriesProvider = {
  provide: ListCategories,
  inject: [CATEGORY_REPOSITORY],
  useFactory: (repo: CategoryRepository): ListCategories =>
    new ListCategories(repo),
};

const createContainerProvider = {
  provide: CreateContainer,
  inject: [CONTAINER_REPOSITORY],
  useFactory: (repo: ContainerRepository) => new CreateContainer(repo),
};

const addLineToContainerProvider = {
  provide: AddLineToContainer,
  inject: [CONTAINER_REPOSITORY],
  useFactory: (repo: ContainerRepository) => new AddLineToContainer(repo),
};

const removeLineFromContainerProvider = {
  provide: RemoveLineFromContainer,
  inject: [CONTAINER_REPOSITORY],
  useFactory: (repo: ContainerRepository) => new RemoveLineFromContainer(repo),
};

const nestContainerProvider = {
  provide: NestContainer,
  inject: [CONTAINER_REPOSITORY],
  useFactory: (repo: ContainerRepository) => new NestContainer(repo),
};

const sealContainerProvider = {
  provide: SealContainer,
  inject: [CONTAINER_REPOSITORY],
  useFactory: (repo: ContainerRepository) => new SealContainer(repo),
};

const moveContainerProvider = {
  provide: MoveContainer,
  inject: [CONTAINER_REPOSITORY],
  useFactory: (repo: ContainerRepository) => new MoveContainer(repo),
};

const getContainerProvider = {
  provide: GetContainer,
  inject: [CONTAINER_REPOSITORY],
  useFactory: (repo: ContainerRepository) => new GetContainer(repo),
};

const listContainersProvider = {
  provide: ListContainers,
  inject: [CONTAINER_REPOSITORY],
  useFactory: (repo: ContainerRepository) => new ListContainers(repo),
};

/**
 * Supplies — the supplies/insumos domain. Owns the category taxonomy and the
 * supply catalog; provides the SupplyLine value object reused by needs, offers
 * and resources (inventory). Hosts the trackable Container aggregate (#140:
 * palet/caja/lote), upstream of logistics and inventory.
 */
@Module({
  imports: [DatabaseModule, IdentityModule],
  controllers: [CategoriesController, ContainerController],
  providers: [
    categoryRepositoryProvider,
    containerRepositoryProvider,
    containerAuthorizationLookupProvider,
    listCategoriesProvider,
    createContainerProvider,
    addLineToContainerProvider,
    removeLineFromContainerProvider,
    nestContainerProvider,
    sealContainerProvider,
    moveContainerProvider,
    getContainerProvider,
    listContainersProvider,
  ],
  exports: [CATEGORY_REPOSITORY, CONTAINER_REPOSITORY],
})
export class SuppliesModule {}
