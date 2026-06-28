import { NeedRepository } from '../domain/ports/need.repository';
import { NeedId } from '../domain/need-id';
import { EditNeedProps } from '../domain/need';
import { Priority } from '../domain/need-enums';
import { NeedNotFoundError } from './need-not-found.error';
import {
  MutationAuditResult,
  diffFields,
} from '../../../shared/domain/mutation-audit';

export interface EditNeedCommand {
  needId: string;
  title?: string;
  description?: string | null;
  priority?: Priority;
}

/**
 * Coordinator/validator edit of a need during validation. Returns the
 * before/after diff so the HTTP layer can record it in the audit trail; the
 * mandatory reason is captured there. Status is unchanged (targetStatus null).
 */
export class EditNeed {
  constructor(private readonly repo: NeedRepository) {}

  async execute(cmd: EditNeedCommand): Promise<MutationAuditResult> {
    const need = await this.repo.findById(NeedId.fromString(cmd.needId));
    if (!need) throw new NeedNotFoundError(cmd.needId);

    const before = {
      title: need.title,
      description: need.description,
      priority: need.priority,
    };

    const edit: EditNeedProps = {};
    if (cmd.title !== undefined) edit.title = cmd.title;
    if (cmd.description !== undefined) edit.description = cmd.description;
    if (cmd.priority !== undefined) edit.priority = cmd.priority;
    need.edit(edit);

    const after = {
      title: need.title,
      description: need.description,
      priority: need.priority,
    };

    await this.repo.save(need);

    return {
      emergencyId: need.emergencyId.value,
      changes: diffFields(before, after),
      targetStatus: null,
    };
  }
}
