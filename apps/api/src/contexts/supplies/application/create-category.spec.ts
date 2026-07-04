import { CreateCategory } from './create-category';
import { InMemoryCategoryAdminRepository } from './in-memory-category-admin.repository';
import { CategoryRecord } from '../domain/category-record';
import {
  CategoryAlreadyExistsError,
  CategoryParentNotFoundError,
  CategoryValidationError,
} from '../domain/category-errors';

function food(): CategoryRecord {
  return {
    slug: 'food',
    labelEs: 'Alimentos',
    labelEn: 'Food',
    parentSlug: null,
    vertical: 'general',
    sort: 1,
    archivedAt: null,
    translations: [],
  };
}

describe('CreateCategory', () => {
  it('crea una subcategoría con padre válido y persiste traducciones', async () => {
    const repo = new InMemoryCategoryAdminRepository([food()]);
    const created = await new CreateCategory(repo).execute({
      slug: 'baby_food',
      labelEs: 'Alimentos para bebé',
      labelEn: 'Baby food',
      parentSlug: 'food',
      vertical: 'general',
      sort: 140,
      translations: [{ locale: 'fr', label: 'Nourriture pour bébé' }],
    });

    expect(created.slug).toBe('baby_food');
    expect(created.parentSlug).toBe('food');
    expect(created.translations).toEqual([
      { locale: 'fr', label: 'Nourriture pour bébé' },
    ]);
    expect(await repo.findBySlug('baby_food')).not.toBeNull();
  });

  it('rechaza un slug duplicado', async () => {
    const repo = new InMemoryCategoryAdminRepository([food()]);
    await expect(
      new CreateCategory(repo).execute({
        slug: 'food',
        labelEs: 'X',
        labelEn: 'X',
        parentSlug: null,
        vertical: 'general',
        sort: 1,
      }),
    ).rejects.toBeInstanceOf(CategoryAlreadyExistsError);
  });

  it('rechaza un padre inexistente', async () => {
    const repo = new InMemoryCategoryAdminRepository([food()]);
    await expect(
      new CreateCategory(repo).execute({
        slug: 'baby_food',
        labelEs: 'A',
        labelEn: 'B',
        parentSlug: 'nope',
        vertical: 'general',
        sort: 1,
      }),
    ).rejects.toBeInstanceOf(CategoryParentNotFoundError);
  });

  it('rechaza etiquetas vacías', async () => {
    const repo = new InMemoryCategoryAdminRepository();
    await expect(
      new CreateCategory(repo).execute({
        slug: 'x',
        labelEs: '   ',
        labelEn: 'B',
        parentSlug: null,
        vertical: 'general',
        sort: 1,
      }),
    ).rejects.toBeInstanceOf(CategoryValidationError);
  });

  it('rechaza que una categoría sea su propio padre', async () => {
    const repo = new InMemoryCategoryAdminRepository();
    await expect(
      new CreateCategory(repo).execute({
        slug: 'x',
        labelEs: 'A',
        labelEn: 'B',
        parentSlug: 'x',
        vertical: 'general',
        sort: 1,
      }),
    ).rejects.toBeInstanceOf(CategoryValidationError);
  });
});
