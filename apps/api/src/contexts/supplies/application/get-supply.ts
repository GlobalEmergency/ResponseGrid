import {
  PublicSupplyRecord,
  SupplyCatalogReadModel,
} from '@globalemergency/warehouse-core/catalog';

export class GetSupply {
  constructor(private readonly catalog: SupplyCatalogReadModel) {}

  async execute(id: string): Promise<PublicSupplyRecord | null> {
    const records = await this.catalog.listActive();
    return records.find((record) => record.id === id) ?? null;
  }
}
