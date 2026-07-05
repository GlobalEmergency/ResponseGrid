import { SupplyRepository } from '../domain/ports/supply.repository';

export interface RemoveSupplyAliasCommand {
  aliasNorm: string;
}

/**
 * Elimina un sinónimo del catálogo (#222). Idempotente: borrar un alias
 * inexistente no es un error.
 */
export class RemoveSupplyAlias {
  constructor(private readonly repo: SupplyRepository) {}

  async execute(cmd: RemoveSupplyAliasCommand): Promise<void> {
    await this.repo.removeAlias(cmd.aliasNorm);
  }
}
