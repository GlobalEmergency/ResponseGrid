import { AttributeDefinitionRepository } from '@globalemergency/warehouse-core/catalog';
import { AttributeDefinitionNotFoundError } from './attribute-definition-admin.errors';

export interface ArchiveAttributeDefinitionCommand {
  categorySlug: string;
  key: string;
}

/**
 * Archiva (soft-delete) una definición de atributo global (#396). Preserva el
 * histórico: `resolveEffectiveSchema` ya ignora las archivadas, así que deja de
 * aplicar a nuevos supplies sin borrar la fila. Falla si no existe.
 */
export class ArchiveAttributeDefinition {
  constructor(private readonly repo: AttributeDefinitionRepository) {}

  async execute(cmd: ArchiveAttributeDefinitionCommand): Promise<void> {
    const existing = await this.repo.findOne(cmd.categorySlug, cmd.key, null);
    if (!existing) {
      throw new AttributeDefinitionNotFoundError(cmd.categorySlug, cmd.key);
    }
    await this.repo.archive(cmd.categorySlug, cmd.key, null);
  }
}
