import {
  Supply,
  SupplyNotFoundError,
  VariantTargetNotFoundError,
  CategoryNotFoundError,
  SupplyRepository,
  SupplyTranslationInput,
  CategoryRepository,
  AttributeDefinitionRepository,
} from '@globalemergency/warehouse-core/catalog';
import { getCategoryPrefix } from '@globalemergency/warehouse-core/kernel';
import { validateSupplyAttributes } from './validate-supply-attributes';

export interface EditSupplyCommand {
  id: string;
  name?: string;
  categorySlug?: string;
  defaultUnit?: string | null;
  attributes?: Record<string, unknown>;
  registrationNotes?: string | null;
  variantOfId?: string | null;
  /**
   * Traducciones de nombre por idioma (#320). Si se indica, REEMPLAZA el set
   * completo (quitar una locale la borra); si se omite, no se tocan.
   */
  translations?: readonly SupplyTranslationInput[];
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
    private readonly attributeRepo: AttributeDefinitionRepository,
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

    // Re-valida los atributos contra el esquema efectivo de la familia cuando
    // cambian los atributos o la categoría (una recategorización puede invalidar
    // atributos válidos en la familia anterior). Persiste la versión validada.
    if (cmd.attributes !== undefined || cmd.categorySlug !== undefined) {
      // Tenencia (#397): valida contra el esquema efectivo del scope del propio
      // insumo (global ∪ tenant si es de tenant). El scope es identidad: no se
      // edita, se conserva del agregado cargado.
      const attributes = await validateSupplyAttributes(
        this.attributeRepo,
        next.categorySlug,
        next.attributes,
        categories,
        next.scopeId,
      );
      next = next.setAttributes(attributes);
    }

    const prefix = getCategoryPrefix(next.categorySlug, categories);
    next = next.updateCodePrefix(prefix);

    await this.repo.save(next, cmd.translations);
  }
}
