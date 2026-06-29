import {
  PublicSupplyRecord,
  SupplyCatalogReadModel,
} from '../domain/ports/supply-catalog.read-model';

export class GetSupply {
  constructor(private readonly catalog: SupplyCatalogReadModel) {}

  async execute(id: string): Promise<PublicSupplyRecord | null> {
    const records = await this.catalog.listActive();
    return records.find((record) => record.id === id) ?? null;
  }
}
