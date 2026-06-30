import { randomUUID } from 'crypto';
import { Supply, formatSupplyCode } from '../domain/supply';
import {
  VariantTargetNotFoundError,
  CategoryNotFoundError,
} from '../domain/supply-errors';
import { SupplyRepository } from '../domain/ports/supply.repository';
import { CategoryRepository } from '../domain/ports/category.repository';
import { getCategoryPrefix } from '../domain/category';

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
 * canónico XXX-NNNN (secuencia) según su categoría raíz. Si es variante, exige
 * que el insumo padre exista. Valida que la categoría exista.
 */
export class CreateSupply {
  constructor(
    private readonly repo: SupplyRepository,
    private readonly categoryRepo: CategoryRepository,
  ) {}

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

    const categories = await this.categoryRepo.listCategories();
    const categoryExists = categories.some((c) => c.slug === cmd.categorySlug);
    if (!categoryExists) {
      throw new CategoryNotFoundError(cmd.categorySlug);
    }

    const prefix = getCategoryPrefix(cmd.categorySlug, categories);
    const seq = await this.repo.nextSequenceValue();
    const code = formatSupplyCode(prefix, seq);

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
