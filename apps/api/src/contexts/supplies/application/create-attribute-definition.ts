import {
  AttributeDefinition,
  AttributeDataType,
  AttributeOption,
  AttributeDefinitionRepository,
  CategoryRepository,
  CategoryNotFoundError,
} from '@globalemergency/warehouse-core/catalog';

export interface CreateAttributeDefinitionCommand {
  categorySlug: string;
  key: string;
  dataType: AttributeDataType;
  required?: boolean | undefined;
  options?: readonly AttributeOption[] | null | undefined;
  unit?: string | null | undefined;
  sort?: number | undefined;
  /**
   * Tenencia (#397): destino de la definición. `undefined`/`null` = global
   * (comportamiento por defecto; los hosts HTTP hoy operan en global). Un
   * `scopeId` de tenant crea una definición que extiende la familia sólo para
   * ese tenant.
   */
  scopeId?: string | null | undefined;
}

/**
 * Alta de una definición de atributo del metamodelo (#396, tenencia #397). La
 * categoría debe existir en la taxonomía. Las invariantes del metamodelo (key,
 * dataType, options/unit) las aplica el agregado `AttributeDefinition.create`.
 *
 * Tenencia (#397): `scopeId` null = definición global; un tenant añade la suya.
 * La regla aditiva (una key de tenant no puede chocar con la misma key global de
 * la ascendencia) la garantiza `resolveEffectiveSchema` al escribir un Supply;
 * aquí sólo se persiste en el scope indicado (candado de unicidad por scope en
 * BD). HTTP se mantiene global en este incremento.
 */
export class CreateAttributeDefinition {
  constructor(
    private readonly repo: AttributeDefinitionRepository,
    private readonly categoryRepo: CategoryRepository,
  ) {}

  async execute(
    cmd: CreateAttributeDefinitionCommand,
  ): Promise<AttributeDefinition> {
    const category = await this.categoryRepo.findBySlug(cmd.categorySlug, {
      includeArchived: true,
    });
    if (!category) {
      throw new CategoryNotFoundError(cmd.categorySlug);
    }

    const definition = AttributeDefinition.create({
      categorySlug: cmd.categorySlug,
      key: cmd.key,
      dataType: cmd.dataType,
      required: cmd.required ?? false,
      options: cmd.options ?? null,
      unit: cmd.unit ?? null,
      sort: cmd.sort ?? 0,
      scopeId: cmd.scopeId ?? null,
    });

    await this.repo.save(definition);
    return definition;
  }
}
