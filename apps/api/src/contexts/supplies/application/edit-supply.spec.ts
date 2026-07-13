import { EditSupply } from './edit-supply';
import {
  Supply,
  SupplyNotFoundError,
  CategoryNotFoundError,
  AttributeValidationError,
  AttributeDefinition,
  SupplyRepository,
  CategoryRepository,
  AttributeDefinitionRepository,
} from '@globalemergency/warehouse-core/catalog';

const ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function makeAttributeRepo(
  overrides: Partial<AttributeDefinitionRepository> = {},
): AttributeDefinitionRepository {
  return {
    findByScope: jest.fn().mockResolvedValue([]),
    findByCategoryAncestry: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(undefined),
    archive: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function existing(): Supply {
  return Supply.create({
    id: ID,
    code: 'WAT-0001',
    name: 'Agua',
    categorySlug: 'water',
    defaultUnit: 'litros',
  });
}

function makeRepo(found: Supply | null, save: jest.Mock): SupplyRepository {
  return {
    findById: jest.fn().mockResolvedValue(found),
    findByCode: jest.fn().mockResolvedValue(null),
    save,
    nextSequenceValue: jest.fn().mockResolvedValue(212),
    list: jest.fn().mockResolvedValue([]),
    listTranslations: jest.fn().mockResolvedValue([]),
    listAliases: jest.fn().mockResolvedValue([]),
    addAlias: jest.fn().mockResolvedValue(undefined),
    removeAlias: jest.fn().mockResolvedValue(undefined),
    merge: jest.fn().mockResolvedValue(undefined),
  };
}

function makeCategoryRepo(
  overrides: Partial<CategoryRepository> = {},
): CategoryRepository {
  return {
    loadAliasMap: jest.fn().mockResolvedValue(new Map()),
    listCategories: jest.fn().mockResolvedValue([
      {
        slug: 'water',
        labelEs: 'Agua',
        labelEn: 'Water',
        parentSlug: null,
        vertical: 'general',
        sort: 20,
        codePrefix: 'WAT',
      },
    ]),
    ...overrides,
  };
}

describe('EditSupply', () => {
  it('aplica sólo los campos provistos y conserva code', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const repo = makeRepo(existing(), save);
    const categoryRepo = makeCategoryRepo();
    await new EditSupply(repo, categoryRepo, makeAttributeRepo()).execute({
      id: ID,
      name: 'Agua mineral',
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const saved = save.mock.calls[0][0] as Supply;
    expect(saved.name).toBe('Agua mineral');
    expect(saved.categorySlug).toBe('water'); // intacto
    expect(saved.code).toBe('WAT-0001');
  });

  it('actualiza automáticamente el prefijo del código al correcto de su categoría al editar', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    // Inicia con INS-0001
    const repo = makeRepo(
      Supply.create({
        id: ID,
        code: 'INS-0001',
        name: 'Agua',
        categorySlug: 'water',
      }),
      save,
    );
    const categoryRepo = makeCategoryRepo();

    await new EditSupply(repo, categoryRepo, makeAttributeRepo()).execute({
      id: ID,
      name: 'Agua con gas',
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const saved = save.mock.calls[0][0] as Supply;
    expect(saved.code).toBe('WAT-0001'); // Se migró a WAT-0001
  });

  it('actualiza el código con el nuevo prefijo si cambia la categoría', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const repo = makeRepo(
      Supply.create({
        id: ID,
        code: 'WAT-0001',
        name: 'Agua',
        categorySlug: 'water',
      }),
      save,
    );
    const categoryRepo = makeCategoryRepo({
      listCategories: jest.fn().mockResolvedValue([
        {
          slug: 'water',
          labelEs: 'Agua',
          labelEn: 'Water',
          parentSlug: null,
          vertical: 'general',
          sort: 20,
          codePrefix: 'WAT',
        },
        {
          slug: 'food',
          labelEs: 'Comida',
          labelEn: 'Food',
          parentSlug: null,
          vertical: 'general',
          sort: 10,
          codePrefix: 'FOD',
        },
      ]),
    });

    await new EditSupply(repo, categoryRepo, makeAttributeRepo()).execute({
      id: ID,
      categorySlug: 'food',
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const saved = save.mock.calls[0][0] as Supply;
    expect(saved.categorySlug).toBe('food');
    expect(saved.code).toBe('FOD-0001'); // Cambió de WAT-0001 a FOD-0001
  });

  it('reemplaza el set de traducciones cuando se indican (#320)', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const repo = makeRepo(existing(), save);
    const categoryRepo = makeCategoryRepo();
    await new EditSupply(repo, categoryRepo, makeAttributeRepo()).execute({
      id: ID,
      translations: [{ locale: 'en', name: 'Mineral water' }],
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const translations = save.mock.calls[0][1] as unknown;
    expect(translations).toEqual([{ locale: 'en', name: 'Mineral water' }]);
  });

  it('no toca las traducciones cuando se omiten (save recibe undefined)', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const repo = makeRepo(existing(), save);
    const categoryRepo = makeCategoryRepo();
    await new EditSupply(repo, categoryRepo, makeAttributeRepo()).execute({
      id: ID,
      name: 'Agua x',
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const translations = save.mock.calls[0][1] as unknown;
    expect(translations).toBeUndefined();
  });

  it('lanza SupplyNotFoundError si no existe', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const repo = makeRepo(null, save);
    const categoryRepo = makeCategoryRepo();
    await expect(
      new EditSupply(repo, categoryRepo, makeAttributeRepo()).execute({
        id: ID,
        name: 'X',
      }),
    ).rejects.toBeInstanceOf(SupplyNotFoundError);
    expect(save).not.toHaveBeenCalled();
  });

  it('exige que la categoría exista si se cambia', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const repo = makeRepo(existing(), save);
    const categoryRepo = makeCategoryRepo({
      listCategories: jest.fn().mockResolvedValue([
        {
          slug: 'water',
          labelEs: 'Agua',
          labelEn: 'Water',
          parentSlug: null,
          vertical: 'general',
          sort: 20,
          codePrefix: 'WAT',
        },
      ]),
    });
    await expect(
      new EditSupply(repo, categoryRepo, makeAttributeRepo()).execute({
        id: ID,
        categorySlug: 'food',
      }),
    ).rejects.toBeInstanceOf(CategoryNotFoundError);
    expect(save).not.toHaveBeenCalled();
  });

  it('valida y persiste los atributos contra el esquema de la familia (#396)', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const repo = makeRepo(existing(), save);
    const categoryRepo = makeCategoryRepo();
    const attributeRepo = makeAttributeRepo({
      findByCategoryAncestry: jest.fn().mockResolvedValue([
        AttributeDefinition.create({
          categorySlug: 'water',
          key: 'volumen_l',
          dataType: 'number',
        }),
      ]),
    });

    await new EditSupply(repo, categoryRepo, attributeRepo).execute({
      id: ID,
      attributes: { volumen_l: '1.5' },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const saved = save.mock.calls[0][0] as Supply;
    expect(saved.attributes).toEqual({ volumen_l: 1.5 }); // coaccionado
  });

  it('rechaza atributos inválidos contra el esquema (#396)', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const repo = makeRepo(existing(), save);
    const categoryRepo = makeCategoryRepo();
    const attributeRepo = makeAttributeRepo({
      findByCategoryAncestry: jest.fn().mockResolvedValue([
        AttributeDefinition.create({
          categorySlug: 'water',
          key: 'volumen_l',
          dataType: 'number',
          required: true,
        }),
      ]),
    });

    await expect(
      new EditSupply(repo, categoryRepo, attributeRepo).execute({
        id: ID,
        attributes: { volumen_l: 'no-es-numero' },
      }),
    ).rejects.toBeInstanceOf(AttributeValidationError);
    expect(save).not.toHaveBeenCalled();
  });

  it('naturaleza (#269): omitir no la toca', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const repo = makeRepo(
      Supply.create({
        id: ID,
        code: 'WAT-0001',
        name: 'Agua',
        categorySlug: 'water',
        nature: 'fungible',
      }),
      save,
    );
    await new EditSupply(repo, makeCategoryRepo(), makeAttributeRepo()).execute(
      {
        id: ID,
        name: 'Agua mineral',
      },
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const saved = save.mock.calls[0][0] as Supply;
    expect(saved.nature).toBe('fungible'); // conservada
  });

  it('naturaleza (#269): null la limpia', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const repo = makeRepo(
      Supply.create({
        id: ID,
        code: 'WAT-0001',
        name: 'Agua',
        categorySlug: 'water',
        nature: 'fungible',
      }),
      save,
    );
    await new EditSupply(repo, makeCategoryRepo(), makeAttributeRepo()).execute(
      {
        id: ID,
        nature: null,
      },
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const saved = save.mock.calls[0][0] as Supply;
    expect(saved.nature).toBeNull();
  });

  it('naturaleza (#269): reclasifica con un valor válido', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const repo = makeRepo(existing(), save); // arranca sin naturaleza (null)
    await new EditSupply(repo, makeCategoryRepo(), makeAttributeRepo()).execute(
      {
        id: ID,
        nature: 'reusable',
      },
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const saved = save.mock.calls[0][0] as Supply;
    expect(saved.nature).toBe('reusable');
  });
});
