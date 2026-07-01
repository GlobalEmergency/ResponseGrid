import { CreateSupply } from './create-supply';
import { Supply } from '../domain/supply';
import {
  VariantTargetNotFoundError,
  CategoryNotFoundError,
} from '../domain/supply-errors';
import { SupplyRepository } from '../domain/ports/supply.repository';
import { CategoryRepository } from '../domain/ports/category.repository';

function makeRepo(overrides: Partial<SupplyRepository> = {}): SupplyRepository {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findByCode: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(undefined),
    nextSequenceValue: jest.fn().mockResolvedValue(212),
    list: jest.fn().mockResolvedValue([]),
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

    const result = await new CreateSupply(repo, categoryRepo).execute({
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

  it('resuelve el prefijo correcto de la categoría raíz para subcategorías (ej. medicines -> MED)', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const nextSequenceValue = jest.fn().mockResolvedValue(212);
    const repo = makeRepo({ save, nextSequenceValue });
    const categoryRepo = makeCategoryRepo();

    const result = await new CreateSupply(repo, categoryRepo).execute({
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
      new CreateSupply(repo, categoryRepo).execute({
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

    await new CreateSupply(repo, categoryRepo).execute({
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
      new CreateSupply(repo, categoryRepo).execute({
        name: 'Agua potable',
        categorySlug: 'water',
      }),
    ).rejects.toBeInstanceOf(CategoryNotFoundError);
  });
});
