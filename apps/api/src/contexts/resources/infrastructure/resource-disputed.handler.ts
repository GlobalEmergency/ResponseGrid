import { Logger } from '@nestjs/common';
import { DomainEventEnvelope } from '../../../shared/events/fan-out';
import { EventHandler } from '../../../shared/events/consumer-worker';
import { AutoHideDisputedResource } from '../application/auto-hide-disputed-resource';

/**
 * Handler for `resource.disputed` on the resources consumer queue: applies the
 * opt-in auto-hide-on-dispute policy (#171). The use case itself no-ops when
 * the emergency hasn't turned the policy on, so the default MVP behavior
 * (visible with a badge, human confirms) is unchanged for every emergency
 * unless a coordinator explicitly opts in.
 */
export function resourceDisputedHandler(
  autoHide: AutoHideDisputedResource,
): EventHandler {
  const logger = new Logger('resourceDisputedHandler');
  return async (event: DomainEventEnvelope): Promise<void> => {
    const payload = event.payload as { emergencyId?: unknown };
    if (typeof payload.emergencyId !== 'string') {
      logger.warn(
        `Skipping malformed ${event.name} for resource ${event.aggregateId}`,
      );
      return;
    }

    await autoHide.execute({
      resourceId: event.aggregateId,
      emergencyId: payload.emergencyId,
    });
  };
}
