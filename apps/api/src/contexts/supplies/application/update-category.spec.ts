import { UpdateCategory } from './update-category';
import { InMemoryCategoryAdminRepository } from './in-memory-category-admin.repository';
import { CategoryRecord } from '../domain/category-record';
import {
  CategoryNotFoundError,
  CategoryValidationError,
} from '../domain/category-errors';

function food(overrides: Partial<CategoryRecord> = {}): CategoryRecord {
  return {
    slug: 'food',
    labelEs: 'Alimentos',
    labelEn: 'Food',
    parentSlug: null,
    vertical: 'general',
    sort: 1,
    archivedAt: null,
    translations: [],
    ...overrides,
  };
}

describe('UpdateCategory', () => {
  it('edita etiquetas y orden dejando el resto intacto', async () => {
    const repo = new InMemoryCategoryAdminRepository([food()]);
    const updated = await new UpdateCategory(repo).execute('food', {
      labelEs: 'Comida',
      sort: 5,
    });
    expect(updated.labelEs).toBe('Comida');
    expect(updated.labelEn).toBe('Food');
    expect(updated.sort).toBe(5);
  });

  it('archiva y restaura vía flag', async () => {
    const repo = new InMemoryCategoryAdminRepository([food()]);
    const uc = new UpdateCategory(repo);

    const archived = await uc.execute('food', { archived: true });
    expect(archived.archivedAt).toBeInstanceOf(Date);

    const restored = await uc.execute('food', { archived: false });
    expect(restored.archivedAt).toBeNull();
  });

  it('reemplaza las traducciones cuando se envían', async () => {
    const repo = new InMemoryCategoryAdminRepository([
      food({ translations: [{ locale: 'fr', label: 'Nourriture' }] }),
    ]);
    const updated = await new UpdateCategory(repo).execute('food', {
      translations: [{ locale: 'pt', label: 'Comida' }],
    });
    expect(updated.translations).toEqual([{ locale: 'pt', label: 'Comida' }]);
  });

  it('falla si la categoría no existe', async () => {
    const repo = new InMemoryCategoryAdminRepository();
    await expect(
      new UpdateCategory(repo).execute('nope', { sort: 1 }),
    ).rejects.toBeInstanceOf(CategoryNotFoundError);
  });

  it('rechaza vaciar una etiqueta obligatoria', async () => {
    const repo = new InMemoryCategoryAdminRepository([food()]);
    await expect(
      new UpdateCategory(repo).execute('food', { labelEs: '  ' }),
    ).rejects.toBeInstanceOf(CategoryValidationError);
  });
});
