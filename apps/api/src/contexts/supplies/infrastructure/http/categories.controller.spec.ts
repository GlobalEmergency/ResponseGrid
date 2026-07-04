import { CategoriesController } from './categories.controller';
import { CategoryDefinition } from '../../domain/category-definition';

describe('CategoriesController', () => {
  const categories: CategoryDefinition[] = [
    {
      slug: 'food',
      labelEs: 'Alimentos',
      labelEn: 'Food',
      parentSlug: null,
      vertical: 'general',
      sort: 1,
      translations: [{ locale: 'fr', label: 'Nourriture' }],
    },
  ];

  it('localiza la etiqueta (es/en/idioma traducido) y mantiene las bases', async () => {
    const controller = new CategoriesController({
      execute: () => Promise.resolve(categories),
    });

    const [en, es, fr] = await Promise.all([
      controller.list('en', { 'accept-language': 'en-US,en;q=0.9' }),
      controller.list('es', { 'accept-language': 'es-VE,es;q=0.9' }),
      controller.list('fr', { 'accept-language': 'fr-FR,fr;q=0.9' }),
    ]);

    expect(en[0]?.label).toBe('Food');
    expect(en[0]?.labelEs).toBe('Alimentos');
    expect(es[0]?.label).toBe('Alimentos');
    expect(fr[0]?.label).toBe('Nourriture');
  });
});
