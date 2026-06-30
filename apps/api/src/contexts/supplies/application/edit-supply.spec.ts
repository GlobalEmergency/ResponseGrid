import { EditSupply } from './edit-supply';
import { Supply } from '../domain/supply';
import {
  SupplyNotFoundError,
  CategoryNotFoundError,
} from '../domain/supply-errors';
import { SupplyRepository } from '../domain/ports/supply.repository';
import { CategoryRepository } from '../domain/ports/category.repository';

const ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

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
    await new EditSupply(repo, categoryRepo).execute({
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

    await new EditSupply(repo, categoryRepo).execute({
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

    await new EditSupply(repo, categoryRepo).execute({
      id: ID,
      categorySlug: 'food',
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const saved = save.mock.calls[0][0] as Supply;
    expect(saved.categorySlug).toBe('food');
    expect(saved.code).toBe('FOD-0001'); // Cambió de WAT-0001 a FOD-0001
  });

  it('lanza SupplyNotFoundError si no existe', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const repo = makeRepo(null, save);
    const categoryRepo = makeCategoryRepo();
    await expect(
      new EditSupply(repo, categoryRepo).execute({ id: ID, name: 'X' }),
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
      new EditSupply(repo, categoryRepo).execute({
        id: ID,
        categorySlug: 'food',
      }),
    ).rejects.toBeInstanceOf(CategoryNotFoundError);
    expect(save).not.toHaveBeenCalled();
  });
});
