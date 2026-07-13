import { CategoriesController } from './categories.controller';
import { CategoryDefinition } from '@globalemergency/warehouse-core/kernel';

describe('CategoriesController', () => {
  const categories: CategoryDefinition[] = [
    {
      slug: 'food',
      labelEs: 'Alimentos',
      labelEn: 'Food',
      parentSlug: null,
      vertical: 'general',
      sort: 1,
      kind: 'material',
      codePrefix: null,
      archivedAt: null,
      translations: [
        { locale: 'es', label: 'Alimentos' },
        { locale: 'en', label: 'Food' },
        { locale: 'fr', label: 'Nourriture' },
      ],
      externalCodes: {},
    },
  ];

  it('resuelve la etiqueta en el locale pedido (N idiomas) con fallback a es', async () => {
    const controller = new CategoriesController({
      execute: () => Promise.resolve(categories),
    });

    const [en, es, fr, pt] = await Promise.all([
      controller.list('en', { 'accept-language': 'en-US,en;q=0.9' }),
      controller.list('es', { 'accept-language': 'es-VE,es;q=0.9' }),
      controller.list('fr', { 'accept-language': 'fr-FR,fr;q=0.9' }),
      controller.list('pt', { 'accept-language': 'pt-BR,pt;q=0.9' }),
    ]);

    expect(en[0]?.label).toBe('Food');
    expect(es[0]?.label).toBe('Alimentos');
    expect(fr[0]?.label).toBe('Nourriture');
    // Sin traducción 'pt' -> cae al base es. Universal, sin hardcodear idiomas.
    expect(pt[0]?.label).toBe('Alimentos');
  });

  it('no expone archivedAt ni campos internos en la proyección pública', async () => {
    const controller = new CategoriesController({
      execute: () => Promise.resolve(categories),
    });

    const result = await controller.list('es', {});

    expect(result[0]).not.toHaveProperty('archivedAt');
    expect(result[0]).not.toHaveProperty('labelEs');
    expect(result[0]).not.toHaveProperty('labelEn');
    expect(result[0]).toEqual({
      slug: 'food',
      label: 'Alimentos',
      parentSlug: null,
      vertical: 'general',
      sort: 1,
      kind: 'material',
    });
  });
});
