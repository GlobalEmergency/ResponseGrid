import { ResolveResourceDispute } from './resolve-resource-dispute';
import { ResourceNotDisputedError } from '../domain/resource-errors';
import { EmergencyAutoHideOnDisputeReader } from '../domain/ports/emergency-auto-hide-on-dispute-reader';
import { AuditTrail } from '../domain/ports/audit-trail';

/** Attributed in the audit trail instead of a human coordinator id. */
export const SYSTEM_ACTOR_ID = 'system';

export interface AutoHideDisputedResourceCommand {
  resourceId: string;
  emergencyId: string;
}

/**
 * Reacts to `ResourceDisputed` when the owning emergency has opted in to the
 * auto-hide-on-dispute policy (#171): resolves the dispute exactly like a
 * coordinator's "confirm cierre" — reusing {@link ResolveResourceDispute}'s
 * `confirm_closed` path, so it is the *same* state transition (same Closed
 * status, same report resolution), just automatic and attributed to "system".
 *
 * No-ops when:
 *  - the policy is off for this emergency (default — MVP behavior unchanged);
 *  - the resource is no longer disputed (a human already resolved it in the
 *    meantime — this handler may be invoked once per `ResourceDisputed` event,
 *    so this keeps it idempotent instead of throwing).
 */
export class AutoHideDisputedResource {
  constructor(
    private readonly policy: EmergencyAutoHideOnDisputeReader,
    private readonly resolve: ResolveResourceDispute,
    private readonly audit: AuditTrail,
  ) {}

  async execute(cmd: AutoHideDisputedResourceCommand): Promise<void> {
    const enabled = await this.policy.getAutoHideOnDispute(cmd.emergencyId);
    if (!enabled) return;

    let result;
    try {
      result = await this.resolve.execute({
        resourceId: cmd.resourceId,
        coordinatorId: SYSTEM_ACTOR_ID,
        resolution: 'confirm_closed',
      });
    } catch (err) {
      if (err instanceof ResourceNotDisputedError) return;
      throw err;
    }

    await this.audit.recordSystemAction({
      action: 'resource.auto_hide_on_dispute',
      entityType: 'resource',
      entityId: cmd.resourceId,
      emergencyId: result.emergencyId,
      targetStatus: result.targetStatus,
      changes: result.changes,
      reason:
        'Ocultado automático: política autoHideOnDispute activa y umbral de disputa alcanzado (#171)',
    });
  }
}
