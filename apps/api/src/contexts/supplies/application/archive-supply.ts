import {
  SupplyNotFoundError,
  SupplyRepository,
} from '@globalemergency/warehouse-core/catalog';

/**
 * Archiva un insumo (#222): lo retira de la cara pública del catálogo sin
 * borrarlo (preserva referencias legadas). Idempotente.
 */
export class ArchiveSupply {
  constructor(private readonly repo: SupplyRepository) {}

  async execute(id: string): Promise<void> {
    const supply = await this.repo.findById(id);
    if (!supply) {
      throw new SupplyNotFoundError(id);
    }
    await this.repo.save(supply.archive());
  }
}
