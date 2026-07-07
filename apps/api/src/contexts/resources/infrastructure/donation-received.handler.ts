import { Logger } from '@nestjs/common';
import { DomainEventEnvelope } from '../../../shared/events/fan-out';
import { EventHandler } from '../../../shared/events/consumer-worker';
import { ReceiveDonationIntoInventory } from '../application/receive-donation-into-inventory';
import { SupplyLineSnapshot } from '@globalemergency/warehouse-core/kernel';

/**
 * Handler for `donation_intake.received` on the resources consumer queue: apply
 * the received supply lines to the target point's inventory. Idempotency is
 * handled by the ConsumerWorker's ledger, so this stays a plain mapping.
 */
export function receiveDonationHandler(
  receive: ReceiveDonationIntoInventory,
): EventHandler {
  const logger = new Logger('receiveDonationHandler');
  return async (event: DomainEventEnvelope): Promise<void> => {
    const payload = event.payload as {
      targetResourceId?: unknown;
      lines?: unknown;
    };
    if (
      typeof payload.targetResourceId !== 'string' ||
      !Array.isArray(payload.lines)
    ) {
      logger.warn(
        `Skipping malformed ${event.name} for intake ${event.aggregateId}`,
      );
      return;
    }

    const result = await receive.execute({
      targetResourceId: payload.targetResourceId,
      lines: payload.lines as SupplyLineSnapshot[],
    });
    if (result === 'resource_not_found') {
      logger.warn(
        `${event.name}: target resource ${payload.targetResourceId} not found; inventory not updated`,
      );
    }
  };
}
