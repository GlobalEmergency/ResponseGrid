import { DeleteCategory } from './delete-category';
import { InMemoryCategoryAdminRepository } from './in-memory-category-admin.repository';
import { CategoryRecord } from '../domain/category-record';
import {
  CategoryNotFoundError,
  CategoryProtectedError,
} from '../domain/category-errors';

function record(slug: string): CategoryRecord {
  return {
    slug,
    labelEs: 'x',
    labelEn: 'x',
    parentSlug: null,
    vertical: 'general',
    sort: 1,
    archivedAt: null,
    translations: [],
  };
}

describe('DeleteCategory', () => {
  it('protege los slugs núcleo (no se pueden borrar)', async () => {
    const repo = new InMemoryCategoryAdminRepository([record('food')]);
    await expect(
      new DeleteCategory(repo).execute('food'),
    ).rejects.toBeInstanceOf(CategoryProtectedError);
    // sigue activa: la protección corta antes de tocar el repo
    expect((await repo.findBySlug('food'))?.archivedAt).toBeNull();
  });

  it('archiva una categoría no núcleo', async () => {
    const repo = new InMemoryCategoryAdminRepository([record('baby_food')]);
    const deleted = await new DeleteCategory(repo).execute('baby_food');
    expect(deleted.archivedAt).toBeInstanceOf(Date);
  });

  it('falla si la categoría no existe', async () => {
    const repo = new InMemoryCategoryAdminRepository();
    await expect(
      new DeleteCategory(repo).execute('nope'),
    ).rejects.toBeInstanceOf(CategoryNotFoundError);
  });
});
