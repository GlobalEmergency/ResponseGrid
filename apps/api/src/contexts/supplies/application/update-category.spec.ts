import { UpdateCategory } from './update-category';
import { CategoryValidationError } from './category-admin.errors';
import { Category } from '../domain/category';
import { CategoryDefinition } from '../domain/category-definition';
import { CategoryRepository } from '../domain/ports/category.repository';

const BASE: CategoryDefinition = {
  slug: 'baby_food',
  labelEs: 'Alimentos para bebé',
  labelEn: 'Baby food',
  parentSlug: 'food',
  vertical: 'general',
  sort: 140,
  archivedAt: null,
  translations: [],
};

function makeRepo(
  override: Partial<CategoryRepository> = {},
): CategoryRepository {
  return {
    loadAliasMap: () => Promise.resolve(new Map()),
    listCategories: () => Promise.resolve([]),
    findBySlug: () => Promise.resolve(BASE),
    createCategory: () => Promise.resolve(BASE),
    updateCategory: (_slug, input) =>
      Promise.resolve({ ...BASE, archivedAt: input.archivedAt ?? null }),
    ...override,
  };
}

describe('UpdateCategory — archive / restore', () => {
  it('archiva una categoría no-núcleo fijando archivedAt', async () => {
    const repo = makeRepo();
    const result = await new UpdateCategory(repo).execute('baby_food', {
      archived: true,
    });
    expect(result.archivedAt).toBeInstanceOf(Date);
  });

  it('restaura una categoría archivada pasando archived: false', async () => {
    const archived: CategoryDefinition = { ...BASE, archivedAt: new Date() };
    const repo = makeRepo({
      findBySlug: () => Promise.resolve(archived),
      updateCategory: (_slug, input) =>
        Promise.resolve({ ...archived, archivedAt: input.archivedAt ?? null }),
    });

    const result = await new UpdateCategory(repo).execute('baby_food', {
      archived: false,
    });
    expect(result.archivedAt).toBeNull();
  });

  it('preserva archivedAt cuando archived no se pasa', async () => {
    const ts = new Date('2026-01-01T00:00:00Z');
    const archived: CategoryDefinition = { ...BASE, archivedAt: ts };
    const repo = makeRepo({
      findBySlug: () => Promise.resolve(archived),
      updateCategory: (_slug, input) =>
        Promise.resolve({ ...archived, archivedAt: input.archivedAt ?? null }),
    });

    const result = await new UpdateCategory(repo).execute('baby_food', {
      labelEs: 'Otro nombre',
    });
    expect(result.archivedAt).toEqual(ts);
  });

  it('rechaza archivar una categoría núcleo', async () => {
    const core: CategoryDefinition = {
      ...BASE,
      slug: Category.Food,
      parentSlug: null,
    };
    const repo = makeRepo({ findBySlug: () => Promise.resolve(core) });

    await expect(
      new UpdateCategory(repo).execute(Category.Food, { archived: true }),
    ).rejects.toBeInstanceOf(CategoryValidationError);
  });
});
