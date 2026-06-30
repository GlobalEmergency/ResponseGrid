import { CreateSupply } from './create-supply';
import { Supply } from '../domain/supply';
import { VariantTargetNotFoundError } from '../domain/supply-errors';
import { SupplyRepository } from '../domain/ports/supply.repository';

function makeRepo(overrides: Partial<SupplyRepository> = {}): SupplyRepository {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findByCode: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(undefined),
    allocateCode: jest.fn().mockResolvedValue('INS-0212'),
    list: jest.fn().mockResolvedValue([]),
    listAliases: jest.fn().mockResolvedValue([]),
    addAlias: jest.fn().mockResolvedValue(undefined),
    removeAlias: jest.fn().mockResolvedValue(undefined),
    merge: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('CreateSupply', () => {
  it('asigna el siguiente código INS-NNNN y persiste el insumo', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const allocateCode = jest.fn().mockResolvedValue('INS-0212');
    const repo = makeRepo({ save, allocateCode });

    const result = await new CreateSupply(repo).execute({
      name: 'Agua potable',
      categorySlug: 'water',
    });

    expect(result.code).toBe('INS-0212');
    expect(allocateCode).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const saved = save.mock.calls[0][0] as Supply;
    expect(saved.code).toBe('INS-0212');
    expect(saved.name).toBe('Agua potable');
    expect(saved.id).toBe(result.id);
  });

  it('crear variante exige que el insumo padre exista', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const allocateCode = jest.fn().mockResolvedValue('INS-0212');
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue(null),
      save,
      allocateCode,
    });

    await expect(
      new CreateSupply(repo).execute({
        name: 'Agua 1.5L',
        categorySlug: 'water',
        variantOfId: '22222222-2222-4222-8222-222222222222',
      }),
    ).rejects.toBeInstanceOf(VariantTargetNotFoundError);
    expect(allocateCode).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it('crea la variante cuando el padre existe', async () => {
    const parent = Supply.create({
      id: '22222222-2222-4222-8222-222222222222',
      code: 'INS-0001',
      name: 'Agua potable',
      categorySlug: 'water',
      defaultUnit: null,
    });
    const save = jest.fn().mockResolvedValue(undefined);
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue(parent),
      save,
    });

    await new CreateSupply(repo).execute({
      name: 'Agua 1.5L',
      categorySlug: 'water',
      variantOfId: parent.id,
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const saved = save.mock.calls[0][0] as Supply;
    expect(saved.variantOfId).toBe(parent.id);
  });
});
