import { SuppliesAdminController } from './supplies-admin.controller';

function makeController(overrides: Record<string, { execute: jest.Mock }>) {
  const useCases = {
    createSupply: {
      execute: jest.fn().mockResolvedValue({ id: 'i', code: 'INS-0212' }),
    },
    editSupply: { execute: jest.fn().mockResolvedValue(undefined) },
    archiveSupply: { execute: jest.fn().mockResolvedValue(undefined) },
    restoreSupply: { execute: jest.fn().mockResolvedValue(undefined) },
    addSupplyAlias: { execute: jest.fn().mockResolvedValue(undefined) },
    removeSupplyAlias: { execute: jest.fn().mockResolvedValue(undefined) },
    mergeSupplies: { execute: jest.fn().mockResolvedValue(undefined) },
    listSuppliesAdmin: { execute: jest.fn().mockResolvedValue([]) },
    getSupplyAdmin: { execute: jest.fn().mockResolvedValue({ id: 'i' }) },
    ...overrides,
  };
  const cache = { invalidate: jest.fn() };
  const controller = new SuppliesAdminController(
    useCases.createSupply as never,
    useCases.editSupply as never,
    useCases.archiveSupply as never,
    useCases.restoreSupply as never,
    useCases.addSupplyAlias as never,
    useCases.removeSupplyAlias as never,
    useCases.mergeSupplies as never,
    useCases.listSuppliesAdmin as never,
    useCases.getSupplyAdmin as never,
    cache as never,
  );
  return { controller, useCases, cache };
}

describe('SuppliesAdminController', () => {
  it('create mapea el DTO, invalida la caché y devuelve {id, code}', async () => {
    const { controller, useCases, cache } = makeController({});
    const res = await controller.create({
      name: 'Agua',
      categorySlug: 'water',
    });
    expect(res).toEqual({ id: 'i', code: 'INS-0212' });
    expect(useCases.createSupply.execute).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Agua', categorySlug: 'water' }),
    );
    expect(cache.invalidate).toHaveBeenCalledTimes(1);
  });

  it('edit inyecta el id de la ruta en el comando', async () => {
    const { controller, useCases } = makeController({});
    await controller.edit('abc', { name: 'X' });
    expect(useCases.editSupply.execute).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'abc', name: 'X' }),
    );
  });

  it('addAlias usa el id de la ruta como supplyId', async () => {
    const { controller, useCases } = makeController({});
    await controller.addAlias('abc', { term: 'agua' });
    expect(useCases.addSupplyAlias.execute).toHaveBeenCalledWith({
      supplyId: 'abc',
      term: 'agua',
    });
  });

  it('removeAlias delega el aliasNorm de la ruta', async () => {
    const { controller, useCases } = makeController({});
    await controller.removeAlias('abc', 'agua');
    expect(useCases.removeSupplyAlias.execute).toHaveBeenCalledWith({
      aliasNorm: 'agua',
    });
  });

  it('merge delega source/target', async () => {
    const { controller, useCases } = makeController({});
    await controller.merge({ sourceId: 's', targetId: 't' });
    expect(useCases.mergeSupplies.execute).toHaveBeenCalledWith({
      sourceId: 's',
      targetId: 't',
    });
  });

  it('archive/restore delegan el id', async () => {
    const { controller, useCases } = makeController({});
    await controller.archive('abc');
    await controller.restore('abc');
    expect(useCases.archiveSupply.execute).toHaveBeenCalledWith('abc');
    expect(useCases.restoreSupply.execute).toHaveBeenCalledWith('abc');
  });
});
