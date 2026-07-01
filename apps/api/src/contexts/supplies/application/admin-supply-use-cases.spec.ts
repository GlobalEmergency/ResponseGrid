import { ArchiveSupply } from './archive-supply';
import { RestoreSupply } from './restore-supply';
import { AddSupplyAlias } from './add-supply-alias';
import { RemoveSupplyAlias } from './remove-supply-alias';
import { ListSuppliesAdmin } from './list-supplies-admin';
import { GetSupplyAdmin } from './get-supply-admin';
import { Supply } from '../domain/supply';
import { SupplyAlias } from '../domain/supply-alias';
import { SupplyNotFoundError } from '../domain/supply-errors';
import { SupplyRepository } from '../domain/ports/supply.repository';

const ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function supply(status: 'active' | 'archived' = 'active'): Supply {
  return Supply.create({
    id: ID,
    code: 'INS-0001',
    name: 'Agua',
    categorySlug: 'water',
    defaultUnit: 'litros',
    status,
  });
}

function makeRepo(overrides: Partial<SupplyRepository> = {}): SupplyRepository {
  return {
    findById: jest.fn().mockResolvedValue(supply()),
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

describe('ArchiveSupply / RestoreSupply', () => {
  it('archive guarda el insumo archivado', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const repo = makeRepo({ save });
    await new ArchiveSupply(repo).execute(ID);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const saved = save.mock.calls[0][0] as Supply;
    expect(saved.status).toBe('archived');
  });

  it('restore guarda el insumo activo', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue(supply('archived')),
      save,
    });
    await new RestoreSupply(repo).execute(ID);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const saved = save.mock.calls[0][0] as Supply;
    expect(saved.status).toBe('active');
  });

  it('archive lanza SupplyNotFoundError si no existe', async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    await expect(new ArchiveSupply(repo).execute(ID)).rejects.toBeInstanceOf(
      SupplyNotFoundError,
    );
  });
});

describe('AddSupplyAlias / RemoveSupplyAlias', () => {
  it('add valida que el insumo exista y persiste el alias normalizado', async () => {
    const addAlias = jest.fn().mockResolvedValue(undefined);
    const repo = makeRepo({ addAlias });
    await new AddSupplyAlias(repo).execute({
      supplyId: ID,
      term: '  Aguíta  ',
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const alias = addAlias.mock.calls[0][0] as SupplyAlias;
    expect(alias.supplyId).toBe(ID);
    expect(alias.alias).toBe('Aguíta'); // el normalizado lo aplica el repo
  });

  it('add lanza SupplyNotFoundError si el insumo no existe', async () => {
    const addAlias = jest.fn().mockResolvedValue(undefined);
    const repo = makeRepo({
      findById: jest.fn().mockResolvedValue(null),
      addAlias,
    });
    await expect(
      new AddSupplyAlias(repo).execute({ supplyId: ID, term: 'x' }),
    ).rejects.toBeInstanceOf(SupplyNotFoundError);
    expect(addAlias).not.toHaveBeenCalled();
  });

  it('remove delega en el repositorio', async () => {
    const removeAlias = jest.fn().mockResolvedValue(undefined);
    const repo = makeRepo({ removeAlias });
    await new RemoveSupplyAlias(repo).execute({ aliasNorm: 'aguita' });
    expect(removeAlias).toHaveBeenCalledWith('aguita');
  });
});

describe('ListSuppliesAdmin / GetSupplyAdmin', () => {
  it('list adjunta los alias y expone campos internos', async () => {
    const repo = makeRepo({
      list: jest.fn().mockResolvedValue([supply('archived')]),
      listAliases: jest
        .fn()
        .mockResolvedValue([
          SupplyAlias.fromSnapshot({ alias: 'aguita', supplyId: ID }),
        ]),
    });
    const views = await new ListSuppliesAdmin(repo).execute({});
    expect(views).toHaveLength(1);
    expect(views[0].status).toBe('archived');
    expect(views[0].aliases).toEqual(['aguita']);
  });

  it('get lanza SupplyNotFoundError si no existe', async () => {
    const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
    await expect(new GetSupplyAdmin(repo).execute(ID)).rejects.toBeInstanceOf(
      SupplyNotFoundError,
    );
  });
});
