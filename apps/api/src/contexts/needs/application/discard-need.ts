import { NeedRepository } from '../domain/ports/need.repository';
import { EventBus } from '../domain/ports/event-bus';
import { NeedId } from '../domain/need-id';
import { NeedNotFoundError } from './need-not-found.error';
import { MutationAuditResult } from '../../../shared/domain/mutation-audit';

export interface DiscardNeedCommand {
  needId: string;
}

/**
 * Discard a need during validation: it transitions to `rejected` and leaves the
 * public queue. The HTTP layer records the mandatory reason in the audit trail.
 */
export class DiscardNeed {
  constructor(
    private readonly repo: NeedRepository,
    private readonly bus: EventBus,
  ) {}

  async execute(cmd: DiscardNeedCommand): Promise<MutationAuditResult> {
    const need = await this.repo.findById(NeedId.fromString(cmd.needId));
    if (!need) throw new NeedNotFoundError(cmd.needId);

    const before = need.status;
    need.reject();
    await this.repo.save(need);
    await this.bus.publish(need.pullDomainEvents());

    return {
      emergencyId: need.emergencyId.value,
      changes: [{ field: 'status', before, after: need.status }],
      targetStatus: need.status,
    };
  }
}
