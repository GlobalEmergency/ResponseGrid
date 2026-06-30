import { randomUUID } from 'crypto';
import { Supply } from '../domain/supply';
import { VariantTargetNotFoundError } from '../domain/supply-errors';
import { SupplyRepository } from '../domain/ports/supply.repository';

export interface CreateSupplyCommand {
  name: string;
  categorySlug: string;
  defaultUnit?: string | null;
  attributes?: Record<string, unknown> | null;
  registrationNotes?: string | null;
  /** Si se indica, el insumo es una variante de otro existente (#222). */
  variantOfId?: string | null;
}

/**
 * Alta de un insumo del catálogo maestro (#222). Asigna el siguiente código
 * canónico INS-NNNN (secuencia). Si es variante, exige que el insumo padre
 * exista.
 */
export class CreateSupply {
  constructor(private readonly repo: SupplyRepository) {}

  async execute(
    cmd: CreateSupplyCommand,
  ): Promise<{ id: string; code: string }> {
    const variantOfId = cmd.variantOfId ?? null;
    if (variantOfId) {
      const parent = await this.repo.findById(variantOfId);
      if (!parent) {
        throw new VariantTargetNotFoundError(variantOfId);
      }
    }

    const code = await this.repo.allocateCode();
    const supply = Supply.create({
      id: randomUUID(),
      code,
      name: cmd.name,
      categorySlug: cmd.categorySlug,
      defaultUnit: cmd.defaultUnit ?? null,
      attributes: cmd.attributes ?? {},
      registrationNotes: cmd.registrationNotes ?? null,
      variantOfId,
    });

    await this.repo.save(supply);
    return { id: supply.id, code: supply.code };
  }
}
