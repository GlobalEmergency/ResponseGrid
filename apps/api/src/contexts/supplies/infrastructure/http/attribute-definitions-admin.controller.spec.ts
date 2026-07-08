import { AttributeDefinitionsAdminController } from './attribute-definitions-admin.controller';
import { AttributeDefinition } from '@globalemergency/warehouse-core/catalog';

const definition = AttributeDefinition.create({
  categorySlug: 'medicines',
  key: 'principio_activo',
  dataType: 'text',
  required: true,
  sort: 2,
});

describe('AttributeDefinitionsAdminController', () => {
  it('lista definiciones y las mapea a DTO', async () => {
    const listDefinitions = {
      execute: jest.fn().mockResolvedValue([definition]),
    };
    const controller = new AttributeDefinitionsAdminController(
      listDefinitions as never,
      { execute: jest.fn() } as never,
      { execute: jest.fn() } as never,
    );

    const result = await controller.list('medicines');

    expect(listDefinitions.execute).toHaveBeenCalledWith({
      categorySlug: 'medicines',
    });
    expect(result[0]).toEqual({
      categorySlug: 'medicines',
      key: 'principio_activo',
      dataType: 'text',
      required: true,
      options: null,
      unit: null,
      sort: 2,
      archivedAt: null,
    });
  });

  it('crea una definición delegando el payload al caso de uso', async () => {
    const createDefinition = {
      execute: jest.fn().mockResolvedValue(definition),
    };
    const controller = new AttributeDefinitionsAdminController(
      { execute: jest.fn() } as never,
      createDefinition as never,
      { execute: jest.fn() } as never,
    );

    const result = await controller.create({
      categorySlug: 'medicines',
      key: 'principio_activo',
      dataType: 'text',
      required: true,
      sort: 2,
    });

    expect(createDefinition.execute).toHaveBeenCalledWith({
      categorySlug: 'medicines',
      key: 'principio_activo',
      dataType: 'text',
      required: true,
      options: undefined,
      unit: undefined,
      sort: 2,
    });
    expect(result.key).toBe('principio_activo');
  });

  it('archiva una definición vía DELETE', async () => {
    const archiveDefinition = {
      execute: jest.fn().mockResolvedValue(undefined),
    };
    const controller = new AttributeDefinitionsAdminController(
      { execute: jest.fn() } as never,
      { execute: jest.fn() } as never,
      archiveDefinition as never,
    );

    await controller.archive('medicines', 'principio_activo');

    expect(archiveDefinition.execute).toHaveBeenCalledWith({
      categorySlug: 'medicines',
      key: 'principio_activo',
    });
  });
});
