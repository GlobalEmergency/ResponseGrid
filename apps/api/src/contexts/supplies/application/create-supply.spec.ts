import { CreateSupply } from './create-supply';
import {
  Supply,
  VariantTargetNotFoundError,
  CategoryNotFoundError,
  AttributeValidationError,
  AttributeKeyCollisionError,
  AttributeDefinition,
  SupplyRepository,
  CategoryRepository,
  AttributeDefinitionRepository,
} from '@globalemergency/warehouse-core/catalog';

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

function makeRepo(overrides: Partial<SupplyRepository> = {}): SupplyRepository {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findByCode: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(undefined),
    nextSequenceValue: jest.fn().mockResolvedValue(212),
    list: jest.fn().mockResolvedValue([]),
    listTranslations: jest.fn().mockResolvedValue([]),
    listAliases: jest.fn().mockResolvedValue([]),
    addAlias: jest.fn().mockResolvedValue(undefined),
    removeAlias: jest.fn().mockResolvedValue(undefined),
    merge: jest.fn().mockResolvedValue(undefined),
    ...overrides,
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
      {
        slug: 'medicines',
        labelEs: 'Medicamentos',
        labelEn: 'Medicines',
        parentSlug: 'medical',
        vertical: 'general',
        sort: 41,
        codePrefix: null,
      },
      {
        slug: 'medical',
        labelEs: 'Médico',
        labelEn: 'Medical',
        parentSlug: null,
        vertical: 'general',
        sort: 40,
        codePrefix: 'MED',
      },
    ]),
    ...overrides,
  };
}

describe('CreateSupply', () => {
  it('asigna el siguiente código XXX-NNNN basado en la categoría raíz y persiste el insumo', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const nextSequenceValue = jest.fn().mockResolvedValue(212);
    const repo = makeRepo({ save, nextSequenceValue });
    const categoryRepo = makeCategoryRepo();

    const result = await new CreateSupply(
      repo,
      categoryRepo,
      makeAttributeRepo(),
    ).execute({
      name: 'Agua potable',
      categorySlug: 'water',
    });

    expect(result.code).toBe('WAT-0212');
    expect(nextSequenceValue).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const saved = save.mock.calls[0][0] as Supply;
    expect(saved.code).toBe('WAT-0212');
    expect(saved.name).toBe('Agua potable');
    expect(saved.id).toBe(result.id);
  });

  it('reenvía las traducciones al repositorio para persistirlas (#320)', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const repo = makeRepo({ save });
    const categoryRepo = makeCategoryRepo();

    await new CreateSupply(repo, categoryRepo, makeAttributeRepo()).execute({
      name: 'Agua potable',
      categorySlug: 'water',
      translations: [{ locale: 'en', name: 'Drinking water' }],
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const translations = save.mock.calls[0][1] as unknown;
    expect(translations).toEqual([{ locale: 'en', name: 'Drinking water' }]);
  });

  it('resuelve el prefijo correcto de la categoría raíz para subcategorías (ej. medicines -> MED)', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const nextSequenceValue = jest.fn().mockResolvedValue(212);
    const repo = makeRepo({ save, nextSequenceValue });
    const categoryRepo = makeCategoryRepo();

    const result = await new CreateSupply(
      repo,
      categoryRepo,
      makeAttributeRepo(),
    ).execute({
      name: 'Ibuprofeno',
      categorySlug: 'medicines',
    });

    expect(result.code).toBe('MED-0212');
    expect(nextSequenceValue).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const saved = save.mock.calls[0][0] as Supply;
    expect(saved.code).toBe('MED-0212');
  });

  it('crear variante exige que el insumo padre exista', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const nextSequenceValue = jest.fn().mockResolvedValue(212);
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue(null),
      save,
      nextSequenceValue,
    });
    const categoryRepo = makeCategoryRepo();

    await expect(
      new CreateSupply(repo, categoryRepo, makeAttributeRepo()).execute({
        name: 'Agua 1.5L',
        categorySlug: 'water',
        variantOfId: '22222222-2222-4222-8222-222222222222',
      }),
    ).rejects.toBeInstanceOf(VariantTargetNotFoundError);
    expect(nextSequenceValue).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it('crea la variante cuando el padre existe', async () => {
    const parent = Supply.create({
      id: '22222222-2222-4222-8222-222222222222',
      code: 'WAT-0001',
      name: 'Agua potable',
      categorySlug: 'water',
      defaultUnit: null,
    });
    const save = jest.fn().mockResolvedValue(undefined);
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue(parent),
      save,
    });
    const categoryRepo = makeCategoryRepo();

    await new CreateSupply(repo, categoryRepo, makeAttributeRepo()).execute({
      name: 'Agua 1.5L',
      categorySlug: 'water',
      variantOfId: parent.id,
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const saved = save.mock.calls[0][0] as Supply;
    expect(saved.variantOfId).toBe(parent.id);
  });

  it('exige que la categoría exista', async () => {
    const repo = makeRepo();
    const categoryRepo = makeCategoryRepo({
      listCategories: jest.fn().mockResolvedValue([
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

    await expect(
      new CreateSupply(repo, categoryRepo, makeAttributeRepo()).execute({
        name: 'Agua potable',
        categorySlug: 'water',
      }),
    ).rejects.toBeInstanceOf(CategoryNotFoundError);
  });

  it('valida/coacciona los atributos contra el esquema efectivo (herencia por el árbol, #396)', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const repo = makeRepo({ save });
    const categoryRepo = makeCategoryRepo();
    // medicines hereda de medical: la definición ancla en medical aplica.
    const findByCategoryAncestry = jest.fn().mockResolvedValue([
      AttributeDefinition.create({
        categorySlug: 'medical',
        key: 'principio_activo',
        dataType: 'text',
        required: true,
      }),
      AttributeDefinition.create({
        categorySlug: 'medicines',
        key: 'dosis_mg',
        dataType: 'number',
        unit: 'mg',
      }),
    ]);
    const attributeRepo = makeAttributeRepo({ findByCategoryAncestry });

    await new CreateSupply(repo, categoryRepo, attributeRepo).execute({
      name: 'Amoxicilina',
      categorySlug: 'medicines',
      attributes: { principio_activo: 'Amoxicilina', dosis_mg: '500' },
    });

    // La ascendencia consultada incluye la propia categoría y su padre.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const ancestry = findByCategoryAncestry.mock.calls[0][0] as string[];
    expect(new Set(ancestry)).toEqual(new Set(['medicines', 'medical']));
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const saved = save.mock.calls[0][0] as Supply;
    expect(saved.attributes).toEqual({
      principio_activo: 'Amoxicilina',
      dosis_mg: 500, // coaccionado string -> number
    });
  });

  it('rechaza atributos que no validan contra el esquema (#396)', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const repo = makeRepo({ save });
    const categoryRepo = makeCategoryRepo();
    const attributeRepo = makeAttributeRepo({
      findByCategoryAncestry: jest.fn().mockResolvedValue([
        AttributeDefinition.create({
          categorySlug: 'medical',
          key: 'principio_activo',
          dataType: 'text',
          required: true,
        }),
      ]),
    });

    await expect(
      new CreateSupply(repo, categoryRepo, attributeRepo).execute({
        name: 'Algo sin principio activo',
        categorySlug: 'medicines',
        attributes: {},
      }),
    ).rejects.toBeInstanceOf(AttributeValidationError);
    expect(save).not.toHaveBeenCalled();
  });

  it('pasa los atributos tal cual si la familia no tiene definiciones', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const repo = makeRepo({ save });
    const categoryRepo = makeCategoryRepo();

    await new CreateSupply(repo, categoryRepo, makeAttributeRepo()).execute({
      name: 'Agua',
      categorySlug: 'water',
      attributes: { cualquier_cosa: 'libre' },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const saved = save.mock.calls[0][0] as Supply;
    expect(saved.attributes).toEqual({ cualquier_cosa: 'libre' });
  });

  // === Tenencia (#397) ===

  const TENANT = '11111111-1111-4111-8111-111111111111';

  it('sin scopeId el insumo es global (null) y consulta sólo definiciones globales', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const findByCategoryAncestry = jest.fn().mockResolvedValue([]);
    const repo = makeRepo({ save });
    const attributeRepo = makeAttributeRepo({ findByCategoryAncestry });

    await new CreateSupply(repo, makeCategoryRepo(), attributeRepo).execute({
      name: 'Agua',
      categorySlug: 'water',
    });

    // El repo se consulta con scope null (sólo globales).
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const scopeArg = findByCategoryAncestry.mock.calls[0][1] as string | null;
    expect(scopeArg).toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const saved = save.mock.calls[0][0] as Supply;
    expect(saved.scopeId).toBeNull();
  });

  it('con scopeId el insumo es de tenant y valida contra global ∪ tenant', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    // El repo (con scope de tenant) devuelve global ∪ tenant; el use-case pasa
    // ese conjunto y el mismo scope a resolveEffectiveSchema.
    const findByCategoryAncestry = jest.fn().mockResolvedValue([
      AttributeDefinition.create({
        categorySlug: 'medical',
        key: 'principio_activo',
        dataType: 'text',
        required: true,
      }),
      AttributeDefinition.create({
        categorySlug: 'medicines',
        key: 'nota_local',
        dataType: 'text',
        scopeId: TENANT,
      }),
    ]);
    const repo = makeRepo({ save });
    const attributeRepo = makeAttributeRepo({ findByCategoryAncestry });

    await new CreateSupply(repo, makeCategoryRepo(), attributeRepo).execute({
      name: 'Amoxicilina local',
      categorySlug: 'medicines',
      attributes: { principio_activo: 'Amoxicilina', nota_local: 'lote X' },
      scopeId: TENANT,
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const scopeArg = findByCategoryAncestry.mock.calls[0][1] as string | null;
    expect(scopeArg).toBe(TENANT);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const saved = save.mock.calls[0][0] as Supply;
    expect(saved.scopeId).toBe(TENANT);
    // Valida contra el atributo de tenant además del global.
    expect(saved.attributes).toEqual({
      principio_activo: 'Amoxicilina',
      nota_local: 'lote X',
    });
  });

  it('rechaza una colisión de key global↔tenant en el esquema efectivo del tenant', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const findByCategoryAncestry = jest.fn().mockResolvedValue([
      AttributeDefinition.create({
        categorySlug: 'medical',
        key: 'dosis',
        dataType: 'text',
      }),
      // Un tenant que intenta redefinir una key global de su ascendencia.
      AttributeDefinition.create({
        categorySlug: 'medicines',
        key: 'dosis',
        dataType: 'text',
        scopeId: TENANT,
      }),
    ]);
    const repo = makeRepo({ save });
    const attributeRepo = makeAttributeRepo({ findByCategoryAncestry });

    await expect(
      new CreateSupply(repo, makeCategoryRepo(), attributeRepo).execute({
        name: 'Colisión',
        categorySlug: 'medicines',
        attributes: { dosis: 'x' },
        scopeId: TENANT,
      }),
    ).rejects.toThrow(AttributeKeyCollisionError);
    expect(save).not.toHaveBeenCalled();
  });
});
