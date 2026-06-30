import { SupplyNotFoundError } from '../domain/supply-errors';
import { SupplyRepository } from '../domain/ports/supply.repository';

/**
 * Reactiva un insumo archivado (#222): vuelve a la cara pública del catálogo.
 * Idempotente.
 */
export class RestoreSupply {
  constructor(private readonly repo: SupplyRepository) {}

  async execute(id: string): Promise<void> {
    const supply = await this.repo.findById(id);
    if (!supply) {
      throw new SupplyNotFoundError(id);
    }
    await this.repo.save(supply.restore());
  }
}
