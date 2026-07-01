import { SupplyNotFoundError } from '../domain/supply-errors';
import { SupplyRepository } from '../domain/ports/supply.repository';
import { AdminSupplyView, toAdminSupplyView } from './admin-supply-view';

/**
 * Detalle de gestión de un insumo (#222): agregado completo + alias. Lanza
 * `SupplyNotFoundError` si no existe.
 */
export class GetSupplyAdmin {
  constructor(private readonly repo: SupplyRepository) {}

  async execute(id: string): Promise<AdminSupplyView> {
    const supply = await this.repo.findById(id);
    if (!supply) {
      throw new SupplyNotFoundError(id);
    }
    const aliases = await this.repo.listAliases(id);
    return toAdminSupplyView(supply, aliases);
  }
}
