import { MergeSupplies } from './merge-supplies';
import { Supply } from '../domain/supply';
import {
  MergeIntoSelfError,
  SupplyNotFoundError,
} from '../domain/supply-errors';
import { SupplyRepository } from '../domain/ports/supply.repository';

function supply(id: string, code: string): Supply {
  return Supply.create({
    id,
    code,
    name: 'Insumo',
    categorySlug: 'other',
    defaultUnit: null,
  });
}

function makeRepo(
  byId: Record<string, Supply>,
  merge: jest.Mock,
): SupplyRepository {
  return {
    findById: jest.fn((id: string) => Promise.resolve(byId[id] ?? null)),
    findByCode: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(undefined),
    allocateCode: jest.fn().mockResolvedValue('INS-0212'),
    list: jest.fn().mockResolvedValue([]),
    listAliases: jest.fn().mockResolvedValue([]),
    addAlias: jest.fn().mockResolvedValue(undefined),
    removeAlias: jest.fn().mockResolvedValue(undefined),
    merge,
  };
}

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

describe('MergeSupplies', () => {
  it('delega la fusión A->B cuando ambos existen', async () => {
    const merge = jest.fn().mockResolvedValue(undefined);
    const repo = makeRepo(
      { [A]: supply(A, 'INS-0001'), [B]: supply(B, 'INS-0002') },
      merge,
    );
    await new MergeSupplies(repo).execute({ sourceId: A, targetId: B });
    expect(merge).toHaveBeenCalledWith(A, B);
  });

  it('rechaza fusionar un insumo consigo mismo', async () => {
    const merge = jest.fn().mockResolvedValue(undefined);
    const repo = makeRepo({ [A]: supply(A, 'INS-0001') }, merge);
    await expect(
      new MergeSupplies(repo).execute({ sourceId: A, targetId: A }),
    ).rejects.toBeInstanceOf(MergeIntoSelfError);
    expect(merge).not.toHaveBeenCalled();
  });

  it('falla si el origen o el destino no existen', async () => {
    const merge = jest.fn().mockResolvedValue(undefined);
    const repo = makeRepo({ [A]: supply(A, 'INS-0001') }, merge);
    await expect(
      new MergeSupplies(repo).execute({ sourceId: A, targetId: B }),
    ).rejects.toBeInstanceOf(SupplyNotFoundError);
    expect(merge).not.toHaveBeenCalled();
  });
});
