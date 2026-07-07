import {
  SupplyAlias,
  SupplyNotFoundError,
  SupplyRepository,
} from '@globalemergency/warehouse-core/catalog';

export interface AddSupplyAliasCommand {
  supplyId: string;
  term: string;
}

/**
 * Asocia un sinónimo a un insumo (#222). El término se normaliza en el dominio;
 * el repositorio rechaza el alias si ya apunta a otro insumo.
 */
export class AddSupplyAlias {
  constructor(private readonly repo: SupplyRepository) {}

  async execute(cmd: AddSupplyAliasCommand): Promise<void> {
    const supply = await this.repo.findById(cmd.supplyId);
    if (!supply) {
      throw new SupplyNotFoundError(cmd.supplyId);
    }
    await this.repo.addAlias(
      SupplyAlias.create({ alias: cmd.term, supplyId: cmd.supplyId }),
    );
  }
}
