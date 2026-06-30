import { ListCategories } from './list-categories';
import { Category } from '../domain/category';
import { CategoryDefinition } from '../domain/category-definition';
import { CategoryRepository } from '../domain/ports/category.repository';

describe('ListCategories', () => {
  it('returns the category taxonomy from the repository', async () => {
    const categories: CategoryDefinition[] = [
      {
        slug: Category.Food,
        labelEs: 'Alimentos',
        labelEn: 'Food',
        parentSlug: null,
        vertical: 'general',
        sort: 10,
        archivedAt: null,
        translations: [
          { locale: 'es', label: 'Alimentos' },
          { locale: 'en', label: 'Food' },
        ],
      },
    ];
    const repo: CategoryRepository = {
      loadAliasMap: () => Promise.resolve(new Map()),
      listCategories: () => Promise.resolve(categories),
      findBySlug: () => Promise.resolve(categories[0] ?? null),
      createCategory: () => Promise.resolve(),
      updateCategory: () => Promise.resolve(),
    };

    const result = await new ListCategories(repo).execute();

    expect(result).toEqual(categories);
  });
});
