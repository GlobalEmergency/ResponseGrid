import {
  SupplyCatalogRecord,
  SupplyRepository,
} from '../domain/ports/supply.repository';

export class GetSupply {
  constructor(private readonly repo: SupplyRepository) {}

  async execute(id: string): Promise<SupplyCatalogRecord | null> {
    const catalog = await this.repo.loadCatalog();
    return catalog.find((record) => record.id === id) ?? null;
  }
}
