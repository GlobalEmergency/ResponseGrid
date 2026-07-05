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
    const [aliases, translations] = await Promise.all([
      this.repo.listAliases(id),
      this.repo.listTranslations(id),
    ]);
    return toAdminSupplyView(supply, aliases, translations);
  }
}
