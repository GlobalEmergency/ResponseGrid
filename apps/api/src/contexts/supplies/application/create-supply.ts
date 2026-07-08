import { randomUUID } from 'crypto';
import {
  Supply,
  formatSupplyCode,
  VariantTargetNotFoundError,
  CategoryNotFoundError,
  SupplyRepository,
  SupplyTranslationInput,
  CategoryRepository,
  AttributeDefinitionRepository,
  resolveEffectiveSchema,
  validateAttributes,
} from '@globalemergency/warehouse-core/catalog';
import {
  getCategoryPrefix,
  CategoryRegistry,
} from '@globalemergency/warehouse-core/kernel';

export interface CreateSupplyCommand {
  name: string;
  categorySlug: string;
  defaultUnit?: string | null;
  attributes?: Record<string, unknown> | null;
  registrationNotes?: string | null;
  /** Si se indica, el insumo es una variante de otro existente (#222). */
  variantOfId?: string | null;
  /** Traducciones de nombre por idioma (#320). El nombre base (`name`) es `es`. */
  translations?: readonly SupplyTranslationInput[];
  /**
   * Tenencia (#397): `undefined`/`null` = insumo global (por defecto; HTTP hoy
   * opera en global). Un `scopeId` de tenant crea el insumo en su scope y valida
   * sus atributos contra el esquema efectivo global ∪ tenant.
   */
  scopeId?: string | null;
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
    private readonly attributeRepo: AttributeDefinitionRepository,
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

    const scopeId = cmd.scopeId ?? null;

    // Valida el `attributes` jsonb contra el esquema efectivo de la familia (la
    // unión de definiciones de la ascendencia de su categoría). Con scope de
    // tenant, el esquema efectivo es global ∪ tenant. Si la familia no tiene
    // definiciones, el esquema es vacío y los atributos pasan tal cual.
    const attributes = await this.validateAttributes(
      cmd.categorySlug,
      cmd.attributes ?? {},
      categories,
      scopeId,
    );

    const prefix = getCategoryPrefix(cmd.categorySlug, categories);
    const seq = await this.repo.nextSequenceValue();
    const code = formatSupplyCode(prefix, seq);

    const supply = Supply.create({
      id: randomUUID(),
      code,
      name: cmd.name,
      categorySlug: cmd.categorySlug,
      defaultUnit: cmd.defaultUnit ?? null,
      attributes,
      registrationNotes: cmd.registrationNotes ?? null,
      variantOfId,
      scopeId,
    });

    await this.repo.save(supply, cmd.translations);
    return { id: supply.id, code: supply.code };
  }

  private async validateAttributes(
    categorySlug: string,
    attributes: Record<string, unknown>,
    categories: readonly { slug: string; parentSlug: string | null }[],
    scopeId: string | null,
  ): Promise<Record<string, unknown>> {
    const registry = CategoryRegistry.fromNodes(
      categories.map((c) => ({
        slug: c.slug,
        parentSlug: c.parentSlug,
        codePrefix: null,
      })),
    );
    const ancestrySlugs = [
      categorySlug,
      ...registry.ancestorsOf(categorySlug).map((n) => n.slug),
    ];
    // Con scope de tenant el repo devuelve global ∪ tenant; sin scope, sólo
    // global. `resolveEffectiveSchema` fusiona ese conjunto por scope.
    const defs = await this.attributeRepo.findByCategoryAncestry(
      ancestrySlugs,
      scopeId,
    );
    const schema = resolveEffectiveSchema(
      categorySlug,
      defs,
      registry,
      scopeId,
    );
    return validateAttributes(attributes, schema);
  }
}
