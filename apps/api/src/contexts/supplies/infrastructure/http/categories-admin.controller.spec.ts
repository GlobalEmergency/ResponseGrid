import { CategoriesAdminController } from './categories-admin.controller';
import { CreateCategory } from '../../application/create-category';
import { UpdateCategory } from '../../application/update-category';
import { DeleteCategory } from '../../application/delete-category';
import { ListAdminCategories } from '../../application/list-admin-categories';
import { InMemoryCategoryAdminRepository } from '../../application/in-memory-category-admin.repository';
import { CategoryRecord } from '../../domain/category-record';
import { CategoryProtectedError } from '../../domain/category-errors';

function controllerWith(seed: CategoryRecord[]): {
  controller: CategoriesAdminController;
  repo: InMemoryCategoryAdminRepository;
} {
  const repo = new InMemoryCategoryAdminRepository(seed);
  const controller = new CategoriesAdminController(
    new ListAdminCategories(repo),
    new CreateCategory(repo),
    new UpdateCategory(repo),
    new DeleteCategory(repo),
  );
  return { controller, repo };
}

const food: CategoryRecord = {
  slug: 'food',
  labelEs: 'Alimentos',
  labelEn: 'Food',
  parentSlug: null,
  vertical: 'general',
  sort: 1,
  archivedAt: null,
  translations: [{ locale: 'fr', label: 'Nourriture' }],
};

describe('CategoriesAdminController', () => {
  it('lista incluyendo archivadas y localiza el label', async () => {
    const archived: CategoryRecord = {
      ...food,
      slug: 'legacy',
      archivedAt: new Date(),
      translations: [],
    };
    const { controller } = controllerWith([food, archived]);

    const result = await controller.list('fr', {
      'accept-language': 'fr-FR,fr;q=0.9',
    });

    expect(result).toHaveLength(2);
    expect(result.find((c) => c.slug === 'food')?.label).toBe('Nourriture');
    expect(result.find((c) => c.slug === 'legacy')?.archivedAt).not.toBeNull();
  });

  it('crea una categoría y mapea el payload', async () => {
    const { controller, repo } = controllerWith([food]);

    const created = await controller.create({
      slug: 'baby_food',
      labelEs: 'Alimentos para bebé',
      labelEn: 'Baby food',
      parentSlug: 'food',
      vertical: 'general',
      sort: 140,
      translations: [{ locale: 'fr', label: 'Nourriture pour bébé' }],
    });

    expect(created.slug).toBe('baby_food');
    expect(created.label).toBe('Alimentos para bebé'); // locale por defecto: es
    expect(await repo.findBySlug('baby_food')).not.toBeNull();
  });

  it('propaga la protección de slug núcleo en delete (lo mapea el filtro global)', async () => {
    const { controller } = controllerWith([food]);
    await expect(controller.remove('food')).rejects.toBeInstanceOf(
      CategoryProtectedError,
    );
  });
});
