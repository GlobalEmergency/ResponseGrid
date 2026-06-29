import {
  PublicSupplyRecord,
  SupplyCatalogReadModel,
} from '../domain/ports/supply-catalog.read-model';

export class GetSupply {
  constructor(private readonly catalog: SupplyCatalogReadModel) {}

  execute(id: string): Promise<PublicSupplyRecord | null> {
    return this.catalog.findActiveById(id);
  }
}
