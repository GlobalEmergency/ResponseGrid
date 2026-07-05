import {
  MergeIntoSelfError,
  SupplyNotFoundError,
} from '../domain/supply-errors';
import { SupplyRepository } from '../domain/ports/supply.repository';

export interface MergeSuppliesCommand {
  /** Insumo duplicado que se absorbe y archiva. */
  sourceId: string;
  /** Insumo canónico que conserva los alias y variantes. */
  targetId: string;
}

/**
 * Fusiona un insumo duplicado A en el canónico B (#222): mueve los alias de A a
 * B, repunta las variantes hijas y archiva A. El re-enlace masivo de líneas
 * legadas se coordina aparte (#226).
 */
export class MergeSupplies {
  constructor(private readonly repo: SupplyRepository) {}

  async execute(cmd: MergeSuppliesCommand): Promise<void> {
    if (cmd.sourceId === cmd.targetId) {
      throw new MergeIntoSelfError(cmd.sourceId);
    }
    const source = await this.repo.findById(cmd.sourceId);
    if (!source) throw new SupplyNotFoundError(cmd.sourceId);
    const target = await this.repo.findById(cmd.targetId);
    if (!target) throw new SupplyNotFoundError(cmd.targetId);

    await this.repo.merge(cmd.sourceId, cmd.targetId);
  }
}
