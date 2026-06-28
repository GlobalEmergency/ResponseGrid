import { ResourceRepository } from '../domain/ports/resource.repository';
import { ResourceId } from '../domain/resource-id';
import { EditResourceProps } from '../domain/resource';
import { ResourceNotFoundError } from './resource-not-found.error';
import {
  MutationAuditResult,
  diffFields,
} from '../../../shared/domain/mutation-audit';

export interface EditResourceCommand {
  resourceId: string;
  name?: string;
  description?: string | null;
  contact?: string | null;
  schedule?: string | null;
}

/**
 * Coordinator/validator edit of a resource during verification. Returns the
 * before/after diff so the HTTP layer can record it (with the mandatory reason)
 * in the audit trail. Verification level is unchanged (targetStatus null).
 */
export class EditResource {
  constructor(private readonly repo: ResourceRepository) {}

  async execute(cmd: EditResourceCommand): Promise<MutationAuditResult> {
    const resource = await this.repo.findById(
      ResourceId.fromString(cmd.resourceId),
    );
    if (!resource) throw new ResourceNotFoundError(cmd.resourceId);

    const before = {
      name: resource.name,
      description: resource.description,
      contact: resource.contact,
      schedule: resource.schedule,
    };

    const edit: EditResourceProps = {};
    if (cmd.name !== undefined) edit.name = cmd.name;
    if (cmd.description !== undefined) edit.description = cmd.description;
    if (cmd.contact !== undefined) edit.contact = cmd.contact;
    if (cmd.schedule !== undefined) edit.schedule = cmd.schedule;
    resource.edit(edit);

    const after = {
      name: resource.name,
      description: resource.description,
      contact: resource.contact,
      schedule: resource.schedule,
    };

    await this.repo.save(resource);

    return {
      emergencyId: resource.emergencyId.value,
      changes: diffFields(before, after),
      targetStatus: null,
    };
  }
}
