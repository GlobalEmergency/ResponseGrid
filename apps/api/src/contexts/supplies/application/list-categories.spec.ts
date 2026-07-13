import { ListCategories } from './list-categories';
import {
  Category,
  CategoryDefinition,
} from '@globalemergency/warehouse-core/kernel';
import { CategoryRepository } from '@globalemergency/warehouse-core/catalog';

const FOOD: CategoryDefinition = {
  slug: Category.Food,
  labelEs: 'Alimentos',
  labelEn: 'Food',
  parentSlug: null,
  vertical: 'general',
  sort: 10,
  kind: 'material',
  codePrefix: 'FOD',
  archivedAt: null,
  translations: [
    { locale: 'es', label: 'Alimentos' },
    { locale: 'en', label: 'Food' },
  ],
  externalCodes: {},
};

function makeRepo(listCategoriesFn: jest.Mock): CategoryRepository {
  return {
    loadAliasMap: () => Promise.resolve(new Map()),
    listCategories: listCategoriesFn,
    findBySlug: () => Promise.resolve(null),
    createCategory: () => Promise.resolve(FOOD),
    updateCategory: () => Promise.resolve(FOOD),
  };
}

describe('ListCategories', () => {
  it('devuelve la taxonomía de categorías del repositorio', async () => {
    const listCategories = jest.fn().mockResolvedValue([FOOD]);
    const result = await new ListCategories(makeRepo(listCategories)).execute();

    expect(result).toEqual([FOOD]);
  });

  it('llama al repositorio sin includeArchived por defecto (cara pública)', async () => {
    const listCategories = jest.fn().mockResolvedValue([FOOD]);

    await new ListCategories(makeRepo(listCategories)).execute();

    expect(listCategories).toHaveBeenCalledWith(undefined);
  });

  it('pasa includeArchived: true cuando se solicita (cara admin)', async () => {
    const archived: CategoryDefinition = { ...FOOD, archivedAt: new Date() };
    const listCategories = jest.fn().mockResolvedValue([FOOD, archived]);

    await new ListCategories(makeRepo(listCategories)).execute({
      includeArchived: true,
    });

    expect(listCategories).toHaveBeenCalledWith({ includeArchived: true });
  });
});
