import {
  SupplyAlias,
  SupplyNotFoundError,
  SupplyRepository,
} from '@globalemergency/warehouse-core/catalog';

export interface AddSupplyAliasCommand {
  supplyId: string;
  term: string;
  /**
   * Tenencia (#397): `undefined`/`null` = alias global (por defecto; HTTP hoy
   * opera en global). Un `scopeId` de tenant crea el alias en su scope. El alias
   * hereda el scope del insumo destino.
   */
  scopeId?: string | null;
}

/**
 * Asocia un sinónimo a un insumo (#222, tenencia #397). El término se normaliza
 * en el dominio; el repositorio rechaza el alias si ya apunta a otro insumo
 * dentro del mismo scope. El alias se crea en el scope del propio insumo (un
 * alias de tenant apunta a un insumo de ese tenant o a uno global visible).
 */
export class AddSupplyAlias {
  constructor(private readonly repo: SupplyRepository) {}

  async execute(cmd: AddSupplyAliasCommand): Promise<void> {
    const supply = await this.repo.findById(cmd.supplyId);
    if (!supply) {
      throw new SupplyNotFoundError(cmd.supplyId);
    }
    // El alias hereda el scope del insumo (un insumo de tenant lleva aliases de
    // tenant; uno global, aliases globales). Si el comando fuerza un scopeId, se
    // respeta (p.ej. un tenant aliasando un insumo global desde su scope).
    const scopeId = cmd.scopeId ?? supply.scopeId;
    await this.repo.addAlias(
      SupplyAlias.create({ alias: cmd.term, supplyId: cmd.supplyId, scopeId }),
    );
  }
}
