import { BadRequestException } from '@nestjs/common';
import { CategoriesAdminController } from './categories-admin.controller';
import { CategoryDefinition } from '../../domain/category-definition';

describe('CategoriesAdminController', () => {
  const category: CategoryDefinition = {
    slug: 'baby_food',
    labelEs: 'Alimentos para bebé',
    labelEn: 'Baby food',
    parentSlug: 'food',
    vertical: 'general',
    sort: 140,
    archivedAt: null,
    translations: [
      { locale: 'es', label: 'Alimentos para bebé' },
      { locale: 'en', label: 'Baby food' },
      { locale: 'fr', label: 'Nourriture pour bébé' },
    ],
  };

  it('lists and localizes categories for admin', async () => {
    const listCategories = { execute: jest.fn().mockResolvedValue([category]) };
    const controller = new CategoriesAdminController(
      listCategories as never,
      { execute: jest.fn() } as never,
      { execute: jest.fn() } as never,
    );

    const result = await controller.list('fr', 'fr-FR,fr;q=0.9');

    expect(listCategories.execute).toHaveBeenCalledWith({
      includeArchived: true,
    });
    expect(result[0]?.label).toBe('Nourriture pour bébé');
  });

  it('creates a category and maps the payload to the write command', async () => {
    const createCategory = { execute: jest.fn().mockResolvedValue(category) };
    const controller = new CategoriesAdminController(
      { execute: jest.fn() } as never,
      createCategory as never,
      { execute: jest.fn() } as never,
    );

    const result = await controller.create(
      {
        slug: 'baby_food',
        labelEs: 'Alimentos para bebé',
        labelEn: 'Baby food',
        parentSlug: 'food',
        vertical: 'general',
        sort: 140,
        translations: [{ locale: 'fr', label: 'Nourriture pour bébé' }],
      },
      'fr',
      'fr-FR,fr;q=0.9',
    );

    expect(createCategory.execute).toHaveBeenCalledWith({
      slug: 'baby_food',
      labelEs: 'Alimentos para bebé',
      labelEn: 'Baby food',
      parentSlug: 'food',
      vertical: 'general',
      sort: 140,
      archivedAt: null,
      translations: [{ locale: 'fr', label: 'Nourriture pour bébé' }],
    });
    expect(result.label).toBe('Nourriture pour bébé');
  });

  it('rejects delete for core slugs', async () => {
    const controller = new CategoriesAdminController(
      { execute: jest.fn() } as never,
      { execute: jest.fn() } as never,
      { execute: jest.fn() } as never,
    );

    await expect(controller.delete('food')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
