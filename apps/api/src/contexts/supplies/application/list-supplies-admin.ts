import {
  SupplyListFilter,
  SupplyRepository,
} from '../domain/ports/supply.repository';
import { AdminSupplyView, toAdminSupplyView } from './admin-supply-view';

/**
 * Listado de gestión del catálogo (#222): incluye archivados y campos internos,
 * con sus alias. Distinto de la cara pública (`ListSupplies` sobre el
 * read-model). Filtra por categoría, estado y búsqueda libre.
 */
export class ListSuppliesAdmin {
  constructor(private readonly repo: SupplyRepository) {}

  async execute(filter: SupplyListFilter): Promise<AdminSupplyView[]> {
    const supplies = await this.repo.list(filter);
    return Promise.all(
      supplies.map(async (supply) =>
        toAdminSupplyView(supply, await this.repo.listAliases(supply.id)),
      ),
    );
  }
}
