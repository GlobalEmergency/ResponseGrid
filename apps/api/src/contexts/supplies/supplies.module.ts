import { Module } from '@nestjs/common';
import { DB, DatabaseModule } from '../../shared/database.module';
import { Db } from '../../shared/db';
import {
  CATEGORY_REPOSITORY,
  CategoryRepository,
} from './domain/ports/category.repository';
import {
  SUPPLY_REPOSITORY,
  SupplyRepository,
} from './domain/ports/supply.repository';
import {
  SUPPLY_CATALOG_READ_MODEL,
  SupplyCatalogReadModel,
} from './domain/ports/supply-catalog.read-model';
import {
  CONTAINER_REPOSITORY,
  ContainerRepository,
} from './domain/ports/container.repository';
import {
  CONTAINER_AUTHORIZATION_LOOKUP,
  ContainerAuthorizationLookup,
} from './domain/ports/container-authorization-lookup';
import { DrizzleCategoryRepository } from './infrastructure/drizzle/drizzle-category.repository';
import { DrizzleSupplyRepository } from './infrastructure/drizzle/drizzle-supply.repository';
import { DrizzleSupplyCatalogReadModel } from './infrastructure/drizzle/drizzle-supply-catalog.read-model';
import { CachingSupplyCatalogReadModel } from './infrastructure/caching-supply-catalog.read-model';
import { DrizzleContainerRepository } from './infrastructure/drizzle/drizzle-container.repository';
import { DrizzleContainerAuthorizationLookup } from './infrastructure/drizzle/drizzle-container-authorization-lookup';
import { ListCategories } from './application/list-categories';
import { CreateCategory } from './application/create-category';
import { UpdateCategory } from './application/update-category';
import { ListSupplies } from './application/list-supplies';
import { GetSupply } from './application/get-supply';
import { CreateSupply } from './application/create-supply';
import { EditSupply } from './application/edit-supply';
import { ArchiveSupply } from './application/archive-supply';
import { RestoreSupply } from './application/restore-supply';
import { AddSupplyAlias } from './application/add-supply-alias';
import { RemoveSupplyAlias } from './application/remove-supply-alias';
import { MergeSupplies } from './application/merge-supplies';
import { ListSuppliesAdmin } from './application/list-supplies-admin';
import { GetSupplyAdmin } from './application/get-supply-admin';
import { CreateContainer } from './application/create-container';
import { AddLineToContainer } from './application/add-line-to-container';
import { RemoveLineFromContainer } from './application/remove-line-from-container';
import { NestContainer } from './application/nest-container';
import { SealContainer } from './application/seal-container';
import { MoveContainer } from './application/move-container';
import { GetContainer } from './application/get-container';
import { ListContainers } from './application/list-containers';
import { CategoriesController } from './infrastructure/http/categories.controller';
import { CategoriesAdminController } from './infrastructure/http/categories-admin.controller';
import { SuppliesController } from './infrastructure/http/supplies.controller';
import { SuppliesAdminController } from './infrastructure/http/supplies-admin.controller';
import { ContainerController } from './infrastructure/http/containers.controller';
import { IdentityModule } from '../identity/infrastructure/identity.module';

const categoryRepositoryProvider = {
  provide: CATEGORY_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): CategoryRepository => new DrizzleCategoryRepository(db),
};

const supplyRepositoryProvider = {
  provide: SUPPLY_REPOSITORY,
  inject: [DB],
  useFactory: (db: Db): SupplyRepository => new DrizzleSupplyRepository(db),
};

// La instancia cacheada se provee bajo su clase concreta para poder inyectarla
// en el controlador admin (que llama a `invalidate()` tras escribir); el token
// del puerto público la reusa con `useExisting` para que sea la MISMA caché.
const cachingSupplyCatalogProvider = {
  provide: CachingSupplyCatalogReadModel,
  inject: [DB],
  useFactory: (db: Db): CachingSupplyCatalogReadModel =>
    new CachingSupplyCatalogReadModel(new DrizzleSupplyCatalogReadModel(db)),
};

const supplyCatalogReadModelProvider = {
  provide: SUPPLY_CATALOG_READ_MODEL,
  useExisting: CachingSupplyCatalogReadModel,
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

const createCategoryProvider = {
  provide: CreateCategory,
  inject: [CATEGORY_REPOSITORY],
  useFactory: (repo: CategoryRepository): CreateCategory =>
    new CreateCategory(repo),
};

const updateCategoryProvider = {
  provide: UpdateCategory,
  inject: [CATEGORY_REPOSITORY],
  useFactory: (repo: CategoryRepository): UpdateCategory =>
    new UpdateCategory(repo),
};

const listSuppliesProvider = {
  provide: ListSupplies,
  inject: [SUPPLY_CATALOG_READ_MODEL],
  useFactory: (readModel: SupplyCatalogReadModel) =>
    new ListSupplies(readModel),
};

const getSupplyProvider = {
  provide: GetSupply,
  inject: [SUPPLY_CATALOG_READ_MODEL],
  useFactory: (readModel: SupplyCatalogReadModel) => new GetSupply(readModel),
};

const createSupplyProvider = {
  provide: CreateSupply,
  inject: [SUPPLY_REPOSITORY, CATEGORY_REPOSITORY],
  useFactory: (repo: SupplyRepository, categoryRepo: CategoryRepository) =>
    new CreateSupply(repo, categoryRepo),
};

const editSupplyProvider = {
  provide: EditSupply,
  inject: [SUPPLY_REPOSITORY, CATEGORY_REPOSITORY],
  useFactory: (repo: SupplyRepository, categoryRepo: CategoryRepository) =>
    new EditSupply(repo, categoryRepo),
};

const archiveSupplyProvider = {
  provide: ArchiveSupply,
  inject: [SUPPLY_REPOSITORY],
  useFactory: (repo: SupplyRepository) => new ArchiveSupply(repo),
};

const restoreSupplyProvider = {
  provide: RestoreSupply,
  inject: [SUPPLY_REPOSITORY],
  useFactory: (repo: SupplyRepository) => new RestoreSupply(repo),
};

const addSupplyAliasProvider = {
  provide: AddSupplyAlias,
  inject: [SUPPLY_REPOSITORY],
  useFactory: (repo: SupplyRepository) => new AddSupplyAlias(repo),
};

const removeSupplyAliasProvider = {
  provide: RemoveSupplyAlias,
  inject: [SUPPLY_REPOSITORY],
  useFactory: (repo: SupplyRepository) => new RemoveSupplyAlias(repo),
};

const mergeSuppliesProvider = {
  provide: MergeSupplies,
  inject: [SUPPLY_REPOSITORY],
  useFactory: (repo: SupplyRepository) => new MergeSupplies(repo),
};

const listSuppliesAdminProvider = {
  provide: ListSuppliesAdmin,
  inject: [SUPPLY_REPOSITORY],
  useFactory: (repo: SupplyRepository) => new ListSuppliesAdmin(repo),
};

const getSupplyAdminProvider = {
  provide: GetSupplyAdmin,
  inject: [SUPPLY_REPOSITORY],
  useFactory: (repo: SupplyRepository) => new GetSupplyAdmin(repo),
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
  controllers: [
    CategoriesController,
    CategoriesAdminController,
    SuppliesController,
    SuppliesAdminController,
    ContainerController,
  ],
  providers: [
    categoryRepositoryProvider,
    supplyRepositoryProvider,
    cachingSupplyCatalogProvider,
    supplyCatalogReadModelProvider,
    containerRepositoryProvider,
    containerAuthorizationLookupProvider,
    listCategoriesProvider,
    createCategoryProvider,
    updateCategoryProvider,
    listSuppliesProvider,
    getSupplyProvider,
    createSupplyProvider,
    editSupplyProvider,
    archiveSupplyProvider,
    restoreSupplyProvider,
    addSupplyAliasProvider,
    removeSupplyAliasProvider,
    mergeSuppliesProvider,
    listSuppliesAdminProvider,
    getSupplyAdminProvider,
    createContainerProvider,
    addLineToContainerProvider,
    removeLineFromContainerProvider,
    nestContainerProvider,
    sealContainerProvider,
    moveContainerProvider,
    getContainerProvider,
    listContainersProvider,
  ],
  exports: [CATEGORY_REPOSITORY, SUPPLY_REPOSITORY, CONTAINER_REPOSITORY],
})
export class SuppliesModule {}
