import { Supply } from '../domain/supply';
import {
  SupplyNotFoundError,
  VariantTargetNotFoundError,
  CategoryNotFoundError,
} from '../domain/supply-errors';
import { SupplyRepository } from '../domain/ports/supply.repository';
import { CategoryRepository } from '../domain/ports/category.repository';
import { getCategoryPrefix } from '../domain/category';

export interface EditSupplyCommand {
  id: string;
  name?: string;
  categorySlug?: string;
  defaultUnit?: string | null;
  attributes?: Record<string, unknown>;
  registrationNotes?: string | null;
  variantOfId?: string | null;
}

/**
 * Edición de un insumo (#222). Aplica sólo los campos provistos vía los
 * mutadores inmutables del agregado. Si la categoría cambia o el código actual
 * tiene un prefijo desactualizado, el código se actualiza dinámicamente al
 * prefijo correcto de su categoría raíz.
 */
export class EditSupply {
  constructor(
    private readonly repo: SupplyRepository,
    private readonly categoryRepo: CategoryRepository,
  ) {}

  async execute(cmd: EditSupplyCommand): Promise<void> {
    const current = await this.repo.findById(cmd.id);
    if (!current) {
      throw new SupplyNotFoundError(cmd.id);
    }

    let next: Supply = current;
    if (cmd.name !== undefined) next = next.rename(cmd.name);

    const categories = await this.categoryRepo.listCategories();

    if (cmd.categorySlug !== undefined) {
      const categoryExists = categories.some(
        (c) => c.slug === cmd.categorySlug,
      );
      if (!categoryExists) {
        throw new CategoryNotFoundError(cmd.categorySlug);
      }
      next = next.recategorize(cmd.categorySlug);
    }
    if (cmd.defaultUnit !== undefined)
      next = next.setDefaultUnit(cmd.defaultUnit);
    if (cmd.attributes !== undefined) next = next.setAttributes(cmd.attributes);
    if (cmd.registrationNotes !== undefined) {
      next = next.setRegistrationNotes(cmd.registrationNotes);
    }
    if (cmd.variantOfId !== undefined) {
      if (cmd.variantOfId) {
        const parent = await this.repo.findById(cmd.variantOfId);
        if (!parent) throw new VariantTargetNotFoundError(cmd.variantOfId);
      }
      next = next.setVariantOf(cmd.variantOfId);
    }

    const prefix = getCategoryPrefix(next.categorySlug, categories);
    next = next.updateCodePrefix(prefix);

    await this.repo.save(next);
  }
}
