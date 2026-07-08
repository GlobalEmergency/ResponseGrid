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
}

/**
 * Alta de una definición de atributo del metamodelo (#396). La categoría debe
 * existir en la taxonomía. Las invariantes del metamodelo (key, dataType,
 * options/unit) las aplica el agregado `AttributeDefinition.create`. Inc 1: sólo
 * definiciones globales (`scopeId === null`).
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
      scopeId: null,
    });

    await this.repo.save(definition);
    return definition;
  }
}
